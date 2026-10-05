import { CardFactory } from 'botbuilder';
import { formatDuration } from '../../common/time';

interface PlannedTask {
  taskName: string;
  priority?: string | null;
  estimatedMinutes?: number | null;
}

const PRIORITY_LABEL: Record<string, string> = {
  'Important / High': 'High',
  high: 'High',
  Normal: 'Normal',
  normal: 'Normal',
  Low: 'Low',
  low: 'Low',
};

/** A bare URL task name becomes a clickable markdown link; anything else is shown as-is
 *  with markdown-significant characters escaped so names render literally. */
function taskLabel(name: string): string {
  const trimmed = name.trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    const short = trimmed.replace(/^https?:\/\//i, '');
    const text = short.length > 50 ? `${short.slice(0, 47)}...` : short;
    return `[${text}](${trimmed})`;
  }
  return trimmed.replace(/([\\`*_[\]])/g, '\\$1');
}

/**
 * The day's plan as a table, posted to the employee's Teams groups when they save it.
 * Built from ColumnSets rather than the 1.5 Table element so it renders on every Teams
 * client (the bot's other cards are 1.3 too).
 */
export class PlanSummaryCard {
  static getCard(
    employeeName: string,
    tasks: PlannedTask[],
    opts: { permissionMinutes?: number; updated?: boolean } = {},
  ) {
    const row = (cells: string[], header = false) => ({
      type: 'ColumnSet',
      spacing: header ? 'Medium' : 'Small',
      separator: !header,
      columns: [
        { width: 'auto', minWidth: '24px', text: cells[0] },
        { width: 'stretch', text: cells[1] },
        { width: '70px', text: cells[2] },
        { width: '90px', text: cells[3] },
      ].map((c) => ({
        type: 'Column',
        width: c.width,
        items: [
          {
            type: 'TextBlock',
            text: c.text,
            wrap: true,
            size: 'Small',
            weight: header ? 'Bolder' : 'Default',
            isSubtle: header,
          },
        ],
      })),
    });

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
