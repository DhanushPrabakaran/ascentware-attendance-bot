import {
  calendarDateOf,
  describeLeavePeriod,
  formatDuration,
  nextMidnight,
  parseClockTime,
  startOfDay,
} from './time';

describe('time helpers', () => {
  describe('formatDuration', () => {
    it.each([
      [0, '0 min'],
      [1, '1 min'],
      [45, '45 min'],
      [60, '1 hr'],
      [65, '1 hr 5 min'],
      [120, '2 hrs'],
      [150, '2 hrs 30 min'],
      [601, '10 hrs 1 min'],
      [-5, '0 min'],
    ])('%i -> %s', (minutes, expected) => {
      expect(formatDuration(minutes)).toBe(expected);
    });
  });

  describe('IST day boundaries', () => {
    const tz = 'Asia/Kolkata';

    it('startOfDay is local midnight (18:30 UTC the day before)', () => {
      // 10:00 IST on 6 Oct = 04:30 UTC
      expect(
        startOfDay(new Date('2026-10-06T04:30:00Z'), tz).toISOString(),
      ).toBe('2026-10-05T18:30:00.000Z');
    });

    it('handles the late-evening UTC window that is already the next IST day', () => {
      // 20:00 UTC on 5 Oct = 01:30 IST on 6 Oct
      expect(
        startOfDay(new Date('2026-10-05T20:00:00Z'), tz).toISOString(),
      ).toBe('2026-10-05T18:30:00.000Z');
    });

    it('nextMidnight is the midnight ending that IST day', () => {
      expect(
        nextMidnight(new Date('2026-10-06T04:30:00Z'), tz).toISOString(),
      ).toBe('2026-10-06T18:30:00.000Z');
      // 23:59 IST still ends at the same midnight
      expect(
        nextMidnight(new Date('2026-10-06T18:29:00Z'), tz).toISOString(),
      ).toBe('2026-10-06T18:30:00.000Z');
    });

    it('calendarDateOf gives the IST date as UTC midnight', () => {
      expect(
        calendarDateOf(new Date('2026-10-05T20:00:00Z'), tz).toISOString(),
      ).toBe('2026-10-06T00:00:00.000Z');
    });

    it('works across a DST change (Europe/London, 25 Oct 2026)', () => {
      const tzLondon = 'Europe/London';
      // Midday on the 25th (GMT, UTC+0) - day started at 00:00 BST = 23:00 UTC on the 24th
      expect(
        startOfDay(new Date('2026-10-25T12:00:00Z'), tzLondon).toISOString(),
      ).toBe('2026-10-24T23:00:00.000Z');
      expect(
        nextMidnight(new Date('2026-10-25T12:00:00Z'), tzLondon).toISOString(),
      ).toBe('2026-10-26T00:00:00.000Z');
    });
  });

  describe('parseClockTime', () => {
    it('parses HH:mm and rejects anything else', () => {
      expect(parseClockTime('09:30')).toBe(570);
      expect(parseClockTime('23:59')).toBe(1439);
      expect(parseClockTime('24:00')).toBeNull();
      expect(parseClockTime('9:30')).toBeNull();
      expect(parseClockTime('')).toBeNull();
    });
  });

  describe('describeLeavePeriod', () => {
    const day = new Date('2026-10-06T00:00:00Z');

    it('hourly leave shows date, times and duration', () => {
      expect(
        describeLeavePeriod({
          startDate: day,
          endDate: day,
          startTime: '10:00',
          endTime: '14:00',
          durationMinutes: 240,
        }),
      ).toBe('Tue, 6 Oct 2026, 10:00–14:00 (4 hrs)');
    });

    it('single full day shows one date, multi-day a range', () => {
      expect(describeLeavePeriod({ startDate: day, endDate: day })).toBe(
        'Tue, 6 Oct 2026',
      );
      expect(
        describeLeavePeriod({
          startDate: day,
          endDate: new Date('2026-10-08T00:00:00Z'),
        }),
      ).toBe('Tue, 6 Oct 2026 – Thu, 8 Oct 2026');
    });
  });
});
