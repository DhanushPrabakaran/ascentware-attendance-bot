import { ReactNode } from 'react';

export interface DataListColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

/**
 * Renders rows as a table at md+ and as stacked cards below md, from the same column
 * definitions - the one responsive list primitive every page list should use instead of
 * hand-rolling its own <table>. The first column is treated as the card's title on mobile.
 */
export function DataList<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.',
}: {
  columns: DataListColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-surface border border-borderBase rounded-xl p-12 text-center text-secondary/40 text-sm font-medium shadow-2xl shadow-background/50">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-borderBase rounded-xl overflow-hidden shadow-2xl shadow-background/50">
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-borderBase">
          <thead className="bg-white/5">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.header}
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-semibold text-secondary/60 uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-borderBase">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-white/5 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={
                      col.className ||
                      'px-6 py-4 whitespace-nowrap text-sm text-secondary/80'
                    }
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="block md:hidden divide-y divide-borderBase">
        {rows.map((row) => (
          <div key={rowKey(row)} className="p-4 space-y-2">
            {columns.map((col, i) =>
              i === 0 ? (
                <div key={col.header}>{col.render(row)}</div>
              ) : (
                <div
                  key={col.header}
                  className="flex justify-between items-center gap-4 text-sm"
                >
                  <span className="text-xs font-semibold text-secondary/50 uppercase tracking-wider shrink-0">
                    {col.header}
                  </span>
                  <span className="text-secondary/80 text-right">
                    {col.render(row)}
                  </span>
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
