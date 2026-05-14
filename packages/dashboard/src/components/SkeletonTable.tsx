export function SkeletonTable({ columnCount = 4 }: { columnCount?: number }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {Array.from({ length: columnCount }, (_, i) => (
                <th
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton columns are static
                  key={`col-${i}`}
                  className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  <div className="h-3 w-14 rounded shimmer" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }, (_, i) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static
                key={`row-${i}`}
                className="border-b border-white/5 last:border-0"
              >
                {Array.from({ length: columnCount }, (_, j) => (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells are static
                    key={`cell-${i}-${j}`}
                    className="px-5 py-3.5"
                  >
                    <div className="h-4 w-20 rounded shimmer" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
