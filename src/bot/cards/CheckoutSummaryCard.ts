import { CardFactory } from 'botbuilder';
import { formatDuration } from '../../common/time';
import { escapeMarkdown, tableRow, taskLabel } from './taskTable';

interface ReviewedTask {
  taskName: string;
  status?: string | null;
  estimatedMinutes?: number | null;
  timeTakenMinutes?: number | null;
  remarks?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  completed: '✅ Completed',
  in_progress: '🔄 In progress',
  blocked: '⛔ Blocked',
  not_started: '⏳ Not started',
};

/** The day's tasks with how each one ended, posted to the employee's Teams groups at
 *  check-out - the same table as the plan card posted at check-in. */
export class CheckoutSummaryCard {
  static getCard(
    employeeName: string,
    tasks: ReviewedTask[],
    totals: { workingMinutes: number; breakMinutes: number },
  ) {
    const widths = ['auto', 'stretch', '90px', '70px', 'stretch'];
    const row = (cells: string[], header = false) =>
      tableRow(cells, widths, header);

    const body: any[] = [
      {
        type: 'TextBlock',
        text: `👋 ${employeeName} has checked out for the day`,
        weight: 'Bolder',
        size: 'Medium',
        wrap: true,
      },
    ];

    if (tasks.length > 0) {
      body.push(row(['#', 'Task', 'Status', 'Time', 'Description'], true));
      tasks.forEach((t, i) =>
        body.push(
          row([
            String(i + 1),
            taskLabel(t.taskName),
            STATUS_LABEL[t.status || ''] || t.status || '—',
            t.timeTakenMinutes ? formatDuration(t.timeTakenMinutes) : '—',
            t.remarks?.trim() ? escapeMarkdown(t.remarks.trim()) : '—',
          ]),
        ),
      );
    } else {
      body.push({
        type: 'TextBlock',
        text: 'No tasks were planned today.',
        isSubtle: true,
        wrap: true,
      });
    }

    const facts = [
      { title: 'Working time', value: formatDuration(totals.workingMinutes) },
      { title: 'Break time', value: formatDuration(totals.breakMinutes) },
    ];
    if (tasks.length > 0) {
      const done = tasks.filter((t) => t.status === 'completed').length;
      facts.push({ title: 'Completed', value: `${done} of ${tasks.length}` });
    }
    body.push({ type: 'FactSet', spacing: 'Medium', separator: true, facts });

    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body,
    });
  }
}
