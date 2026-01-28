export default function RunResults({ scenario, run, loading, error }) {
  if (error) {
    return <div className="text-red-400">{error}</div>
  }
  if (loading) {
    return <div className="text-slate-300">Running simulation…</div>
  }
  if (!run) {
    return <div className="text-slate-400 text-sm">Build a scenario and hit Run to see results.</div>
  }

  const s = run.summary || {}

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Run Results</h2>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Card label="Throughput (rps)" value={s.throughput_rps?.toFixed(2)} />
        <Card label="p50 latency (ms)" value={s.p50_ms?.toFixed(2)} />
        <Card label="p90 latency (ms)" value={s.p90_ms?.toFixed(2)} />
        <Card label="p99 latency (ms)" value={s.p99_ms?.toFixed(2)} />
        <Card label="Avg queue (ms)" value={s.avg_queue_ms?.toFixed(2)} />
        <Card label="GPU util (%)" value={s.gpu_util_percent?.toFixed(1)} />
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">Run ID: {run.id}</span>
        {run.trace && <a className="text-emerald-400 underline" href={run.trace} target="_blank" rel="noreferrer">Download trace.json</a>}
      </div>
    </div>
  )
}

function Card({ label, value }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
      <div className="text-slate-400 text-xs uppercase">{label}</div>
      <div className="text-lg font-semibold">{value ?? '—'}</div>
    </div>
  )
}
