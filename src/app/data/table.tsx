export function Table<T>({
  rows,
  columns,
  render,
}: {
  rows: T[];
  columns: string[];
  render: (row: T) => React.ReactNode[];
}) {
  return (
    <section>
      {rows.length === 0 ? (
        <p className="py-4 font-map-mono text-[12px] text-dim">No rows yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px] leading-[1.4]">
            <thead>
              <tr className="font-map-mono text-[11px] text-mute">
                {columns.map((c, i) => (
                  <th key={i} className="whitespace-nowrap py-2 pr-6 text-left font-normal">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-hair align-top">
                  {render(row).map((cell, j) => (
                    <td key={j} className={`py-2 pr-6 ${j === 0 ? "font-map-mono text-[12px]" : ""}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
