export default function StageAggregates({ aggregates }) {
  if (!aggregates?.length) return <div className="text-slate-400 text-sm">No stage data yet.</div>
  return (
    <div className="space-y-2 text-sm">
      <div className="font-semibold text-slate-200">Stage Breakdown</div>
      {aggregates.map((a, i) => (
        <div key={i} className="flex justify-between bg-slate-800/50 border border-slate-700 rounded px-2 py-1">
          <span className="text-slate-200">{a.name} ({a.category})</span>
          <span className="text-slate-400">avg {a.avg_ms.toFixed(2)} ms • total {a.total_ms.toFixed(1)} ms</span>
        </div>
      ))}
    </div>
  )
}
