import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { TurnContext } from 'botbuilder';
import { Logger } from 'nestjs-pino';
import { CheckInHandler } from './checkin.handler';
import { SaveAllTasksHandler } from './save-all-tasks.handler';
import { SubmitReviewHandler } from './submit-review.handler';
import { SubmitLeaveHandler } from './submit-leave.handler';
import { CorrectCheckOutHandler } from './correct-checkout.handler';
import { AttendanceService } from '../../../attendance/attendance.service';
import { WorkPlanService } from '../../../work-plan/work-plan.service';
import { AdminService } from '../../../admin/admin.service';
import { BotHelper } from '../../BotHelper';

/** Every TextBlock text and input value in a handler's card activities. */
function cardTexts(result: any): string[] {
  const out: string[] = [];
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'TextBlock') out.push(node.text);
    if (typeof node.id === 'string' && node.value !== undefined) {
      out.push(`${node.id}=${node.value}`);
    }
    Object.values(node).forEach((v) =>
      Array.isArray(v) ? v.forEach(walk) : walk(v),
    );
  };
  (result.activities || []).forEach((a: any) =>
    (a.attachments || []).forEach((att: any) => walk(att.content)),
  );
  return out;
}

const context = (name = 'Jane') =>
  ({
    activity: { from: { id: '29:jane', name } },
  }) as unknown as TurnContext;

describe('CheckInHandler', () => {
  let attendance: DeepMockProxy<AttendanceService>;
  let workPlan: DeepMockProxy<WorkPlanService>;
  let botHelper: DeepMockProxy<BotHelper>;
  let handler: CheckInHandler;

  beforeEach(() => {
    attendance = mockDeep<AttendanceService>();
    workPlan = mockDeep<WorkPlanService>();
    botHelper = mockDeep<BotHelper>();
    handler = new CheckInHandler(attendance, botHelper, workPlan);
    attendance.checkIn.mockResolvedValue({
      id: 'att-2',
      employeeId: 'e1',
    } as any);
    attendance.getApprovedPermissionMinutesToday.mockResolvedValue(0);
    workPlan.getUnfinishedTasksFromLastDay.mockResolvedValue(null);
  });

  it('checks in, tells the group, and shows an empty plan card', async () => {
    const result = await handler.execute(context(), { action: 'checkIn' });
    expect(botHelper.notifyGroupChat).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('Jane'),
    );
    expect(cardTexts(result).some((t) => t.startsWith('taskName_'))).toBe(
      false,
    );
  });

  it("pre-fills yesterday's unfinished tasks and approved permission", async () => {
    attendance.getApprovedPermissionMinutesToday.mockResolvedValue(90);
    workPlan.getUnfinishedTasksFromLastDay.mockResolvedValue({
      date: new Date('2026-10-02T04:00:00Z'), // a Friday
      tasks: [
        {
          taskName: 'Fix login',
          priority: 'Important / High',
          estimatedMinutes: 60,
        },
        { taskName: 'Docs', priority: 'Low', estimatedMinutes: 0 },
      ],
    } as any);

    const texts = cardTexts(
      await handler.execute(context(), { action: 'checkIn' }),
    );

    expect(workPlan.getUnfinishedTasksFromLastDay).toHaveBeenCalledWith(
      'e1',
      'att-2',
    );
    expect(texts).toEqual(
      expect.arrayContaining([
        'taskName_1=Fix login',
        'priority_1=Important / High',
        'estimatedMinutes_1=60',
        'taskName_2=Docs',
        'permissionMinutes=90',
      ]),
    );
    expect(
      texts.some((t) =>
        t.includes('Carried over 2 unfinished task(s) from Friday'),
      ),
    ).toBe(true);
  });
});

describe('SaveAllTasksHandler', () => {
  let workPlan: DeepMockProxy<WorkPlanService>;
  let botHelper: DeepMockProxy<BotHelper>;
  let handler: SaveAllTasksHandler;

  beforeEach(() => {
    workPlan = mockDeep<WorkPlanService>();
    botHelper = mockDeep<BotHelper>();
    handler = new SaveAllTasksHandler(workPlan, botHelper, mockDeep<Logger>());
    workPlan.getTasksByAttendanceId.mockResolvedValue([]);
  });

  it('saves up to 10 tasks in order and posts the plan to the group', async () => {
    const value: any = { attendanceId: 'att-1', permissionMinutes: '0' };
    for (let i = 1; i <= 10; i++) {
      value[`taskName_${i}`] = `Task ${i}`;
      value[`estimatedMinutes_${i}`] = '30';
    }
    await handler.execute(context(), value);

    const saved = workPlan.saveDailyPlan.mock.calls[0][1];
    expect(saved.map((t) => t.taskName)).toEqual(
      Array.from({ length: 10 }, (_, i) => `Task ${i + 1}`),
    );
    expect(botHelper.notifyGroupChat).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ attachments: expect.any(Array) }),
    );
  });

  it('rejects an empty plan without saving', async () => {
    const result = await handler.execute(context(), {
      attendanceId: 'att-1',
      permissionMinutes: '0',
    });
    expect(workPlan.saveDailyPlan).not.toHaveBeenCalled();
    expect(result.activities?.[0]).toEqual(
      expect.objectContaining({
        text: expect.stringContaining('at least one task'),
      }),
    );
  });

  it('still confirms the save when posting to the group fails', async () => {
    botHelper.notifyGroupChat.mockRejectedValue(new Error('Teams down'));
    const result = await handler.execute(context(), {
      attendanceId: 'att-1',
      taskName_1: 'One',
    });
    expect(workPlan.saveDailyPlan).toHaveBeenCalled();
    expect(cardTexts(result)).toContain('Day Planned');
  });
});

describe('SubmitReviewHandler', () => {
  let workPlan: DeepMockProxy<WorkPlanService>;
  let attendance: DeepMockProxy<AttendanceService>;
  let botHelper: DeepMockProxy<BotHelper>;
  let handler: SubmitReviewHandler;

  beforeEach(() => {
    workPlan = mockDeep<WorkPlanService>();
    attendance = mockDeep<AttendanceService>();
    botHelper = mockDeep<BotHelper>();
    handler = new SubmitReviewHandler(
      workPlan,
      attendance,
      botHelper,
      mockDeep<Logger>(),
    );
    attendance.checkOut.mockResolvedValue({
      workingMinutes: 485,
      breakMinutes: 45,
    } as any);
    workPlan.getTasksByAttendanceId.mockResolvedValue([]);
  });

  it('saves task progress, checks out and posts the summary table', async () => {
    const result = await handler.execute(context(), {
      attendanceId: 'att-1',
      status_t1: 'blocked',
      timeTaken_t1: '30',
      remarks_t1: 'Waiting on API',
    });

    expect(workPlan.bulkUpdateTaskProgress).toHaveBeenCalledWith([
      {
        id: 't1',
        status: 'blocked',
        timeTakenMinutes: 30,
        remarks: 'Waiting on API',
      },
    ]);
    expect(attendance.checkOut).toHaveBeenCalledWith('att-1');
    expect(botHelper.notifyGroupChat).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ attachments: expect.any(Array) }),
    );
    expect(cardTexts(result)).toContain(
      'Working Time: 8 hrs 5 min, Break Time: 45 min',
    );
  });
});

describe('SubmitLeaveHandler', () => {
  let admin: DeepMockProxy<AdminService>;
  let botHelper: DeepMockProxy<BotHelper>;
  let handler: SubmitLeaveHandler;

  beforeEach(() => {
    admin = mockDeep<AdminService>();
    botHelper = mockDeep<BotHelper>();
    handler = new SubmitLeaveHandler(admin, botHelper, mockDeep<Logger>());
  });

  it('shows the form again with the error when the request is refused', async () => {
    admin.createLeaveForTeamsUser.mockRejectedValue(
      new Error('This overlaps your approved Sick leave (Tue, 6 Oct 2026)'),
    );
    const result = await handler.execute(context(), {
      leaveType: 'Personal',
      leaveMode: 'days',
      startDate: '2026-10-06',
      endDate: '2026-10-06',
      reason: 'Trip',
    });
    expect(cardTexts(result)).toContain(
      'Error: This overlaps your approved Sick leave (Tue, 6 Oct 2026)',
    );
  });

  it('sends managers an approval card with the balance', async () => {
    admin.createLeaveForTeamsUser.mockResolvedValue({
      id: 'l1',
      employeeId: 'e1',
      startDate: new Date('2026-10-06T00:00:00Z'),
      endDate: new Date('2026-10-06T00:00:00Z'),
    } as any);
    admin.getManagersForTeamsUser.mockResolvedValue([
      { teamsUserId: '29:boss' },
    ] as any);
    admin.describeLeaveBalance.mockResolvedValue('3 of 12 days used in 2026');

    await handler.execute(context(), {
      leaveType: 'Sick',
      leaveMode: 'days',
      startDate: '2026-10-06',
      endDate: '2026-10-06',
      reason: 'Fever',
    });

    const sent = botHelper.sendDirectMessage.mock.calls[0];
    expect(sent[1]).toBe('29:boss');
    expect(JSON.stringify(sent[2])).toContain('3 of 12 days used in 2026');
  });
});

describe('CorrectCheckOutHandler', () => {
  let attendance: DeepMockProxy<AttendanceService>;
  let admin: DeepMockProxy<AdminService>;
  let handler: CorrectCheckOutHandler;
  const session = {
    id: 'att-1',
    employeeId: 'e1',
    autoCheckedOut: true,
    checkIn: new Date('2026-10-05T03:30:00Z'),
    checkOut: new Date('2026-10-05T12:30:00Z'),
    workingMinutes: 540,
  };

  beforeEach(() => {
    attendance = mockDeep<AttendanceService>();
    admin = mockDeep<AdminService>();
    handler = new CorrectCheckOutHandler(attendance, admin);
    admin.findEmployeeByTeamsUserId.mockResolvedValue({ id: 'e1' } as any);
  });

  it('updates the check-out time', async () => {
    attendance.findById.mockResolvedValue(session as any);
    attendance.correctCheckOut.mockResolvedValue({
      ...session,
      checkOut: new Date('2026-10-05T11:30:00Z'),
      workingMinutes: 480,
    } as any);

    const result = await handler.execute(context(), {
      attendanceId: 'att-1',
      checkOutTime: '17:00',
    });

    expect(attendance.correctCheckOut).toHaveBeenCalledWith('att-1', '17:00');
    expect(cardTexts(result)).toContain(
      'Mon 5 Oct: 09:00–17:00, 8 hrs worked.',
    );
  });

  it("refuses someone else's session and re-asks on a bad time", async () => {
    attendance.findById.mockResolvedValue({
      ...session,
      employeeId: 'other',
    } as any);
    let result = await handler.execute(context(), {
      attendanceId: 'att-1',
      checkOutTime: '17:00',
    });
    expect(attendance.correctCheckOut).not.toHaveBeenCalled();
    expect(result.activities?.[0]).toEqual(
      expect.objectContaining({ text: expect.stringContaining("isn't yours") }),
    );

    attendance.findById.mockResolvedValue(session as any);
    attendance.correctCheckOut.mockRejectedValue(
      new Error('Check-out must be after the check-in time'),
    );
    result = await handler.execute(context(), {
      attendanceId: 'att-1',
      checkOutTime: '08:00',
    });
    expect(result.markConsumed).toBe(false);
    expect(cardTexts(result)).toContain(
      'Error: Check-out must be after the check-in time',
    );
  });
});
