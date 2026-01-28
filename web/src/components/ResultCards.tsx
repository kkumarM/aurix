import React from 'react'

export default function ResultCards({ summary, runId, trace, onOpenTimeline }: { summary?: any, runId?: string, trace?: string, onOpenTimeline?: () => void }) {
  if (!summary) return <div className="text-slate-400 text-sm">Run a scenario to see results.</div>
  const cards = [
    { label: 'Throughput (rps)', value: summary.throughput_rps },
    { label: 'p50 latency (ms)', value: summary.p50_ms },
    { label: 'p90 latency (ms)', value: summary.p90_ms },
    { label: 'p99 latency (ms)', value: summary.p99_ms },
    { label: 'Avg queue (ms)', value: summary.avg_queue_ms },
    { label: 'Compute Busy (%)', value: summary.gpu_util_percent, tooltip: 'Approx compute busy based on throughput vs concurrency' },
  ]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="bg-slate-800/50 border border-slate-700 rounded p-3" title={c.tooltip}>
            <div className="text-slate-400 text-xs uppercase">{c.label}</div>
            <div className="text-lg font-semibold">{c.value !== undefined && c.value !== null ? Number(c.value).toFixed(2) : '—'}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">Run ID: {runId}</span>
        {trace && <a className="text-emerald-400 underline" href={trace} target="_blank" rel="noreferrer">Download trace.json</a>}
        {onOpenTimeline && <button className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-semibold" onClick={onOpenTimeline}>Open Timeline</button>}
      </div>
    </div>
  )
}
