/** Shared pieces for the task tables posted to Teams groups (plan at check-in, summary at check-out).
 *  Built from ColumnSets rather than the 1.5 Table element so they render on every Teams client. */

export const PRIORITY_LABEL: Record<string, string> = {
  'Important / High': 'High',
  high: 'High',
  Normal: 'Normal',
  normal: 'Normal',
  Low: 'Low',
  low: 'Low',
};

/** Escape markdown-significant characters so free text renders literally. */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]])/g, '\\$1');
}

/** A bare URL task name becomes a clickable markdown link; anything else is shown as-is
 *  with markdown-significant characters escaped so names render literally. */
export function taskLabel(name: string): string {
  const trimmed = name.trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    const short = trimmed.replace(/^https?:\/\//i, '');
    const text = short.length > 50 ? `${short.slice(0, 47)}...` : short;
    return `[${text}](${trimmed})`;
  }
  return escapeMarkdown(trimmed);
}

/** One table row; `widths` are Adaptive Card column widths, one per cell. */
export function tableRow(cells: string[], widths: string[], header = false) {
  return {
    type: 'ColumnSet',
    spacing: header ? 'Medium' : 'Small',
    separator: !header,
    columns: cells.map((text, i) => ({
      type: 'Column',
      width: widths[i],
      items: [
        {
          type: 'TextBlock',
          text,
          wrap: true,
          size: 'Small',
          weight: header ? 'Bolder' : 'Default',
          isSubtle: header,
        },
      ],
    })),
  };
}
