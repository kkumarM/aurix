import Card from './ui/Card'
import Button from './ui/Button'
import TimelineViewer from './TimelineViewer'

export default function CompareView({ runs, compareIds, onSelect, backendUrl, onOpenSummary, onOpenTimeline }) {
  const options = runs.map((r) => ({ id: r.id, label: `${r.id} • ${r.summary?.throughput_rps?.toFixed(2) ?? '?'} rps / p99 ${(r.summary?.p99_ms ?? 0).toFixed(1)} ms` }))
  const runA = runs.find((r) => r.id === compareIds[0])
  const runB = runs.find((r) => r.id === compareIds[1])

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <div className="text-slate-100 font-semibold">Compare outcomes first, then inspect why</div>
        <div className="text-sm text-slate-400">
          Use each run&apos;s Decision Summary to compare feasibility and bottleneck, then use the stacked timelines below to validate the reason.
        </div>
        <div className="flex flex-wrap gap-2">
          {runA && <Button variant="secondary" onClick={() => onOpenSummary?.(runA.id)}>Open Run A summary</Button>}
          {runB && <Button variant="secondary" onClick={() => onOpenSummary?.(runB.id)}>Open Run B summary</Button>}
          {runA && <Button variant="ghost" onClick={() => onOpenTimeline?.(runA.id)}>Open Run A timeline</Button>}
          {runB && <Button variant="ghost" onClick={() => onOpenTimeline?.(runB.id)}>Open Run B timeline</Button>}
        </div>
      </Card>
      <div className="grid md:grid-cols-2 gap-2 text-sm">
        <Select label="Run A" options={options} value={compareIds[0]} onChange={(id) => onSelect(id, compareIds[1])} />
        <Select label="Run B" options={options} value={compareIds[1]} onChange={(id) => onSelect(compareIds[0], id)} />
      </div>
      {!(runA && runB) && <div className="text-slate-400 text-sm">Select two runs to compare.</div>}
      {runA && runB && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Legend: Sim timelines stacked; same zoom/scale.</div>
          <div className="space-y-4">
            <TimelineViewer runId={runA.id} backendUrl={backendUrl} height={300} compact />
            <TimelineViewer runId={runB.id} backendUrl={backendUrl} height={300} compact />
          </div>
        </div>
      )}
    </div>
  )
}

function Select({ label, options, value, onChange }) {
  return (
    <label className="text-xs text-slate-300 space-y-1">
      <span>{label}</span>
      <select className="input bg-slate-900/60 text-slate-100 border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-400/30" value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Choose…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
