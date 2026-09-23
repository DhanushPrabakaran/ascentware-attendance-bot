import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { TurnContext } from 'botbuilder';
import { StartBreakHandler } from './start-break.handler';
import { AttendanceService } from '../../../attendance/attendance.service';
import { BotHelper } from '../../BotHelper';

describe('StartBreakHandler', () => {
  let attendanceService: DeepMockProxy<AttendanceService>;
  let botHelper: DeepMockProxy<BotHelper>;
  let handler: StartBreakHandler;
  let context: TurnContext;

  beforeEach(() => {
    attendanceService = mockDeep<AttendanceService>();
    botHelper = mockDeep<BotHelper>();
    handler = new StartBreakHandler(attendanceService, botHelper);
    context = {
      activity: { from: { name: 'Jane Doe' } },
    } as unknown as TurnContext;
  });

  it('starts the break, notifies the group chat, and returns two card activities', async () => {
    const result = await handler.execute(context, { attendanceId: 'att-1' });

    expect(attendanceService.startBreak).toHaveBeenCalledWith('att-1');
    expect(botHelper.notifyGroupChat).toHaveBeenCalledWith(
      context,
      expect.stringContaining('Jane Doe'),
    );

    expect(result.deleteReplyToId).toBe(true);
    expect(result.markConsumed).toBe(true);
    expect(result.activities).toHaveLength(2);
    expect(result.activities?.[0]).toEqual(
      expect.objectContaining({ type: 'message' }),
    );
    expect(result.setActivities).toEqual([
      { actionKey: 'att-1_endBreak', activityId: '' },
    ]);
  });

  it('falls back to a generic name when the Teams activity has none', async () => {
    context = {
      activity: { from: {} },
    } as unknown as TurnContext;

    await handler.execute(context, { attendanceId: 'att-2' });

    expect(botHelper.notifyGroupChat).toHaveBeenCalledWith(
      context,
      expect.stringContaining('An employee'),
    );
  });

  it('propagates errors from the attendance service without swallowing them', async () => {
    attendanceService.startBreak.mockRejectedValue(
      new Error('Cannot start break from current status'),
    );

    await expect(
      handler.execute(context, { attendanceId: 'att-1' }),
    ).rejects.toThrow('Cannot start break from current status');
    expect(botHelper.notifyGroupChat).not.toHaveBeenCalled();
  });
});
