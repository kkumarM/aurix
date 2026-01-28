export default function RequestDetails({ breakdown, selectedId }) {
  if (!breakdown || selectedId === null || selectedId === undefined) {
    return <div className="text-slate-400 text-sm">Click a span to see request details.</div>
  }
  const req = breakdown.requests.find(r => r.id === selectedId)
  if (!req) return <div className="text-slate-400 text-sm">Request not found.</div>
  return (
    <div className="space-y-2 text-sm">
      <div className="text-slate-300 font-semibold">Request #{req.id}</div>
      <div className="grid grid-cols-2 gap-2 text-slate-400">
        <div>Arrival: {req.arrival_ms.toFixed(2)} ms</div>
        <div>Total: {req.total_ms.toFixed(2)} ms</div>
        <div>Queue: {req.queue_ms.toFixed(2)} ms</div>
        <div>Start: {req.start_ms.toFixed(2)} ms</div>
        <div>End: {req.end_ms.toFixed(2)} ms</div>
      </div>
      <div className="space-y-1">
        {req.stages.map((s, i) => (
          <div key={i} className="flex justify-between bg-slate-800/50 border border-slate-700 rounded px-2 py-1">
            <span className="text-slate-200">{s.name} ({s.cat})</span>
            <span className="text-slate-400">{(s.end_ms - s.start_ms).toFixed(2)} ms</span>
          </div>
        ))}
      </div>
    </div>
  )
}
