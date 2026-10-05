import { CheckoutSummaryCard } from './CheckoutSummaryCard';

/** All TextBlock texts in the card, in order. */
function texts(card: any): string[] {
  const out: string[] = [];
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'TextBlock') out.push(node.text);
    if (node.type === 'FactSet')
      node.facts.forEach((f: any) => out.push(`${f.title}=${f.value}`));
    Object.values(node).forEach((v) =>
      Array.isArray(v) ? v.forEach(walk) : walk(v),
    );
  };
  walk(card.content);
  return out;
}

describe('CheckoutSummaryCard', () => {
  it('renders each task with its status, time taken and description', () => {
    const t = texts(
      CheckoutSummaryCard.getCard(
        'Jane',
        [
          {
            taskName: 'Fix login',
            status: 'completed',
            timeTakenMinutes: 90,
            remarks: 'Deployed to *prod*',
          },
          {
            taskName: 'https://jira.example.com/browse/ABC-1',
            status: 'blocked',
            timeTakenMinutes: 0,
            remarks: '',
          },
        ],
        { workingMinutes: 485, breakMinutes: 45 },
      ),
    );
    expect(t[0]).toBe('👋 Jane has checked out for the day');
    expect(t).toEqual(
      expect.arrayContaining([
        '#',
        'Task',
        'Status',
        'Time',
        'Description',
        'Fix login',
        '✅ Completed',
        '1 hr 30 min',
        'Deployed to \\*prod\\*',
        '[jira.example.com/browse/ABC-1](https://jira.example.com/browse/ABC-1)',
        '⛔ Blocked',
        'Working time=8 hrs 5 min',
        'Break time=45 min',
        'Completed=1 of 2',
      ]),
    );
  });

  it('still shows the day totals when no tasks were planned', () => {
    const t = texts(
      CheckoutSummaryCard.getCard('Jane', [], {
        workingMinutes: 60,
        breakMinutes: 0,
      }),
    );
    expect(t).toContain('No tasks were planned today.');
    expect(t).toContain('Working time=1 hr');
    expect(t.some((x) => x.startsWith('Completed='))).toBe(false);
  });
});
