import { PlanSummaryCard } from './PlanSummaryCard';

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

describe('PlanSummaryCard', () => {
  it('renders a header row plus one row per task with formatted durations', () => {
    const t = texts(
      PlanSummaryCard.getCard(
        'Jane',
        [
          {
            taskName: 'Fix login',
            priority: 'Important / High',
            estimatedMinutes: 90,
          },
          { taskName: 'Review PR', priority: 'Low', estimatedMinutes: 30 },
        ],
        { permissionMinutes: 120 },
      ),
    );
    expect(t[0]).toBe("📝 Jane's plan for today");
    expect(t).toEqual(
      expect.arrayContaining([
        '#',
        'Task',
        'Priority',
        'Est. time',
        'Fix login',
        'High',
        '1 hr 30 min',
        'Review PR',
        'Low',
        '30 min',
        'Total estimate=2 hrs',
        'Permission=2 hrs',
      ]),
    );
  });

  it('turns a bare URL task into a link and escapes markdown in plain names', () => {
    const t = texts(
      PlanSummaryCard.getCard('Jane', [
        {
          taskName: 'https://jira.example.com/browse/ABC-1',
          estimatedMinutes: 0,
        },
        { taskName: 'fix *bold* [x]', estimatedMinutes: 15 },
      ]),
    );
    expect(t).toContain(
      '[jira.example.com/browse/ABC-1](https://jira.example.com/browse/ABC-1)',
    );
    expect(t).toContain('fix \\*bold\\* \\[x\\]');
    expect(t).toContain('—'); // no estimate
  });

  it('marks an edited plan and handles no tasks', () => {
    const t = texts(PlanSummaryCard.getCard('Jane', [], { updated: true }));
    expect(t[0]).toBe("📝 Jane's plan for today (updated)");
    expect(t).toContain('No tasks planned.');
  });
});
