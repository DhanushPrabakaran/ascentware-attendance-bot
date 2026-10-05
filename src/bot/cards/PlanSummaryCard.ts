import { CardFactory } from 'botbuilder';
import { formatDuration } from '../../common/time';
import { PRIORITY_LABEL, tableRow, taskLabel } from './taskTable';

interface PlannedTask {
  taskName: string;
  priority?: string | null;
  estimatedMinutes?: number | null;
}

/** The day's plan as a table, posted to the employee's Teams groups when they save it. */
export class PlanSummaryCard {
  static getCard(
    employeeName: string,
    tasks: PlannedTask[],
    opts: { permissionMinutes?: number; updated?: boolean } = {},
  ) {
    const widths = ['auto', 'stretch', '70px', '90px'];
    const row = (cells: string[], header = false) =>
      tableRow(cells, widths, header);

    const totalMinutes = tasks.reduce(
      (sum, t) => sum + (t.estimatedMinutes || 0),
      0,
    );

    const body: any[] = [
      {
        type: 'TextBlock',
        text: `📝 ${employeeName}'s plan for today${opts.updated ? ' (updated)' : ''}`,
        weight: 'Bolder',
        size: 'Medium',
        wrap: true,
      },
    ];

    if (tasks.length > 0) {
      body.push(row(['#', 'Task', 'Priority', 'Est. time'], true));
      tasks.forEach((t, i) =>
        body.push(
          row([
            String(i + 1),
            taskLabel(t.taskName),
            PRIORITY_LABEL[t.priority || ''] || t.priority || 'Normal',
            t.estimatedMinutes ? formatDuration(t.estimatedMinutes) : '—',
          ]),
        ),
      );
    } else {
      body.push({
        type: 'TextBlock',
        text: 'No tasks planned.',
        isSubtle: true,
        wrap: true,
      });
    }

    const facts: { title: string; value: string }[] = [];
    if (totalMinutes > 0) {
      facts.push({
        title: 'Total estimate',
        value: formatDuration(totalMinutes),
      });
    }
    if (opts.permissionMinutes && opts.permissionMinutes > 0) {
      facts.push({
        title: 'Permission',
        value: formatDuration(opts.permissionMinutes),
      });
    }
    if (facts.length > 0) {
      body.push({ type: 'FactSet', spacing: 'Medium', separator: true, facts });
    }

    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body,
    });
  }
}
