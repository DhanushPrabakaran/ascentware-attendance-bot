import { buildPersonDay, DaySession, summarizeDays } from './person-day';

/** IST wall clock on Mon 5 Oct 2026 as a UTC instant. */
const ist = (clock: string) => {
  const [h, m] = clock.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, 5, h, m) - 330 * 60000);
};

const session = (overrides: Partial<DaySession> = {}): DaySession => ({
  id: 'a1',
  checkIn: ist('09:00'),
  checkOut: null,
  status: 'checked_in',
  workingMinutes: 0,
  breakMinutes: 0,
  permissionMinutes: 0,
  autoCheckedOut: false,
  breaks: [],
  dailyTasks: [],
  ...overrides,
});

const task = (status: string, est = 60, spent = 0) => ({
  id: status,
  taskName: status,
  priority: 'normal',
  estimatedMinutes: est,
  timeTakenMinutes: spent,
  status,
  remarks: null,
});

const shift = { startTime: '09:00', endTime: '18:00' };

describe('buildPersonDay', () => {
  it('computes live worked time for an open session, minus a running break', () => {
    const day = buildPersonDay(
      [
        session({
          status: 'on_break',
          breaks: [
            {
              breakStart: ist('11:00'),
              breakEnd: ist('11:15'),
              duration: 15,
              type: 'break',
            },
            {
              breakStart: ist('13:00'),
              breakEnd: null,
              duration: 0,
              type: 'lunch',
            },
          ],
        }),
      ],
      [],
      shift,
      ist('13:30'),
    );
    expect(day.state).toBe('on_break');
    expect(day.breakMinutes).toBe(45);
    expect(day.lunchMinutes).toBe(30);
    expect(day.workedMinutes).toBe(270 - 45);
    expect(day.onBreakType).toBe('lunch');
    expect(day.late).toBe(false);
  });

  it('merges two sessions and totals their tasks', () => {
    const day = buildPersonDay(
      [
        session({
          id: 'a2',
          checkIn: ist('14:00'),
          checkOut: ist('18:00'),
          status: 'checked_out',
          workingMinutes: 240,
          dailyTasks: [task('blocked', 30, 10)],
        }),
        session({
          checkOut: ist('12:00'),
          status: 'checked_out',
          workingMinutes: 180,
          dailyTasks: [task('completed', 60, 90), task('in_progress')],
        }),
      ],
      [],
      shift,
      ist('19:00'),
    );
    expect(day.checkIn).toEqual(ist('09:00'));
    expect(day.checkOut).toEqual(ist('18:00'));
    expect(day.workedMinutes).toBe(420);
    expect(day.attendanceIds).toEqual(['a1', 'a2']);
    expect(day.taskStats).toEqual({
      planned: 3,
      completed: 1,
      inProgress: 1,
      blocked: 1,
      notStarted: 0,
      estimatedMinutes: 150,
      spentMinutes: 100,
    });
  });

  it('flags late check-ins after the grace period unless hourly leave covers it', () => {
    const late = buildPersonDay(
      [session({ checkIn: ist('09:20') })],
      [],
      shift,
      ist('10:00'),
    );
    expect(late.late).toBe(true);
    const onTime = buildPersonDay(
      [session({ checkIn: ist('09:14') })],
      [],
      shift,
      ist('10:00'),
    );
    expect(onTime.late).toBe(false);
    const excused = buildPersonDay(
      [session({ checkIn: ist('11:00') })],
      [
        {
          id: 'l',
          leaveType: 'Permission',
          startTime: '09:00',
          endTime: '11:00',
          durationMinutes: 120,
        },
      ],
      shift,
      ist('12:00'),
    );
    expect(excused.late).toBe(false);
  });

  it('is on leave for full-day leave and absent otherwise', () => {
    expect(
      buildPersonDay(
        [],
        [
          {
            id: 'l',
            leaveType: 'Sick',
            startTime: null,
            endTime: null,
            durationMinutes: null,
          },
        ],
        shift,
      ).state,
    ).toBe('on_leave');
    expect(buildPersonDay([], [], shift).state).toBe('absent');
  });
});

describe('summarizeDays', () => {
  it('averages over days worked only', () => {
    const worked = (checkIn: string, minutes: number) =>
      buildPersonDay(
        [
          session({
            checkIn: ist(checkIn),
            checkOut: ist('18:00'),
            status: 'checked_out',
            workingMinutes: minutes,
            dailyTasks: [task('completed', 60, 45)],
          }),
        ],
        [],
        shift,
      );
    const stats = summarizeDays([
      { date: '2026-10-05', day: worked('09:00', 480) },
      { date: '2026-10-06', day: worked('09:30', 420) },
      { date: '2026-10-07', day: buildPersonDay([], [], shift) },
    ]);
    expect(stats).toEqual(
      expect.objectContaining({
        daysWorked: 2,
        workedMinutes: 900,
        avgWorkedMinutes: 450,
        avgCheckIn: '09:15',
        lateDays: 1,
        tasksPlanned: 2,
        tasksCompleted: 2,
        estimatedMinutes: 120,
        spentMinutes: 90,
      }),
    );
  });
});
