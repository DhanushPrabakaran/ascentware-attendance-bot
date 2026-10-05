import { CardFactory } from 'botbuilder';
import { escapeMarkdown, tableRow, taskLabel } from './taskTable';

/** One person's day, as the digests see it. Times are already formatted ("09:12"). */
export interface MemberDay {
  name: string;
  state: 'working' | 'on_break' | 'checked_out' | 'on_leave' | 'absent';
  checkIn?: string;
  checkOut?: string;
  autoCheckedOut?: boolean;
  /** "Sick leave" for a full day, "Permission 10:00–14:00" for hours. */
  leave?: string;
  tasksTotal: number;
  tasksDone: number;
  blocked: string[];
}

const card = (body: any[]) =>
  CardFactory.adaptiveCard({
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.3',
    body,
  });

const title = (text: string) => ({
  type: 'TextBlock',
  text,
  weight: 'Bolder',
  size: 'Medium',
  wrap: true,
});

/**
 * Daily team summaries posted to each Teams group - who's in each morning, how the
 * day went each evening. Same ColumnSet table as the plan/check-out cards.
 */
export class DigestCard {
  static morning(day: string, members: MemberDay[]) {
    const widths = ['stretch', 'stretch'];
    const status = (m: MemberDay) => {
      const leave = m.leave ? ` · 🌴 ${escapeMarkdown(m.leave)}` : '';
      switch (m.state) {
        case 'working':
          return `✅ In since ${m.checkIn}${leave}`;
        case 'on_break':
          return `☕ On break (in since ${m.checkIn})${leave}`;
        case 'checked_out':
          return `👋 Checked out at ${m.checkOut}${leave}`;
        case 'on_leave':
          return `🌴 ${escapeMarkdown(m.leave || 'On leave')}`;
        default:
          return `— Not checked in${leave}`;
      }
    };

    const present = members.filter((m) =>
      ['working', 'on_break', 'checked_out'].includes(m.state),
    ).length;
    const onLeave = members.filter((m) => m.state === 'on_leave').length;
    const notIn = members.filter((m) => m.state === 'absent').length;

    return card([
      title(`☀️ Team status · ${day}`),
      tableRow(['Name', 'Status'], widths, true),
      ...members.map((m) =>
        tableRow([escapeMarkdown(m.name), status(m)], widths),
      ),
      {
        type: 'FactSet',
        spacing: 'Medium',
        separator: true,
        facts: [
          { title: 'Checked in', value: `${present} of ${members.length}` },
          { title: 'On leave', value: String(onLeave) },
          { title: 'Not checked in yet', value: String(notIn) },
        ],
      },
    ]);
  }

  static evening(day: string, members: MemberDay[]) {
    const widths = ['stretch', 'stretch', '60px', 'stretch'];
    const status = (m: MemberDay) => {
      switch (m.state) {
        case 'working':
        case 'on_break':
          return `🟢 Still checked in (since ${m.checkIn})`;
        case 'checked_out':
          return `👋 ${m.checkIn}–${m.checkOut}${m.autoCheckedOut ? ' (auto)' : ''}`;
        case 'on_leave':
          return `🌴 ${escapeMarkdown(m.leave || 'On leave')}`;
        default:
          return '— No check-in';
      }
    };

    const worked = members.filter(
      (m) => m.state !== 'absent' && m.state !== 'on_leave',
    );
    const done = worked.reduce((sum, m) => sum + m.tasksDone, 0);
    const total = worked.reduce((sum, m) => sum + m.tasksTotal, 0);
    const blocked = worked.reduce((sum, m) => sum + m.blocked.length, 0);

    return card([
      title(`🌙 End of day · ${day}`),
      tableRow(['Name', 'Day', 'Tasks', 'Blocked'], widths, true),
      ...members.map((m) =>
        tableRow(
          [
            escapeMarkdown(m.name),
            status(m),
            m.tasksTotal ? `${m.tasksDone}/${m.tasksTotal}` : '—',
            m.blocked.length ? m.blocked.map(taskLabel).join(', ') : '—',
          ],
          widths,
        ),
      ),
      {
        type: 'FactSet',
        spacing: 'Medium',
        separator: true,
        facts: [
          {
            title: 'Worked today',
            value: `${worked.length} of ${members.length}`,
          },
          { title: 'Tasks completed', value: `${done} of ${total}` },
          { title: 'Blocked tasks', value: String(blocked) },
        ],
      },
    ]);
  }
}
