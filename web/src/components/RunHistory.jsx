import { useMemo } from 'react'

export default function RunHistory({ runs, onSelectCompare }) {
  const options = useMemo(() => runs.map(r => ({ id: r.id, label: `${r.id} • ${r.summary?.throughput_rps?.toFixed(2) ?? '?'} rps / p99 ${(r.summary?.p99_ms ?? 0).toFixed(1)} ms` })), [runs])

  if (!runs.length) return <div className="text-slate-400 text-sm">No runs yet.</div>

  const last = runs.slice(-2)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Compare Runs</h3>
        <button className="text-xs text-emerald-400" onClick={() => onSelectCompare(last[0]?.id, last[1]?.id)}>Compare last two</button>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <Select options={options} label="Run A" onChange={(id) => onSelectCompare(id, null)} />
        <Select options={options} label="Run B" onChange={(id) => onSelectCompare(null, id)} />
      </div>
    </div>
  )
}

function Select({ options, label, onChange }) {
  return (
    <label className="text-xs text-slate-400 space-y-1">
      <span>{label}</span>
      <select className="input" onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  )
}
