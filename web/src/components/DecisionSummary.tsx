import React from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import { Diagnostics } from '../utils/diagnostics'

type Props = {
  diagnostics: Diagnostics | null
  compact?: boolean
  onExplain?: () => void
}

export default function DecisionSummary({ diagnostics, compact = false, onExplain }: Props) {
  if (!diagnostics) return null
  const primary = diagnostics.primary || 'Mixed'
  const explanation = explain(primary, diagnostics)
  const actions = recommend(primary)
  const confidence = diagnostics.calibrated ? 'Calibrated' : 'Estimated'

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm bg-slate-900/70 border border-slate-800 rounded-md px-3 py-2">
        <Badge tone="neutral">{primary}</Badge>
        <span className="text-slate-200">{explanation}</span>
        <span className="ml-auto text-xs text-slate-400">{confidence}</span>
      </div>
    )
  }

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-3">
        <div className="text-slate-100 font-semibold text-lg">Decision Summary</div>
        <Badge tone="neutral">{primary}</Badge>
        <span className="text-xs text-slate-400">{confidence}</span>
        {onExplain && <button className="ml-auto text-emerald-300 text-sm" onClick={onExplain}>Explain this run</button>}
      </div>
      <div className="text-slate-200 text-sm">{explanation}</div>
      <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
        {actions.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </Card>
  )
}

function explain(primary: string, diag: Diagnostics) {
  switch (primary) {
    case 'Queue-bound': return 'Latency is dominated by queueing under load.'
    case 'GPU-bound': return `Compute is the hot spot; GPU busy ${diag.gpuBusy.toFixed(0)}%.`
    case 'Transfer-bound': return 'Transfers consume a large share; overlap is limited.'
    case 'CPU-bound': return 'CPU stages dominate time before/after GPU.'
    default: return 'Mixed contributors; inspect timeline for hotspots.'
  }
}

function recommend(primary: string) {
  switch (primary) {
    case 'Queue-bound':
      return ['Lower RPS or increase GPUs/concurrency', 'Reduce per-request work or batch size', 'Check arrival jitter and smooth bursts']
    case 'GPU-bound':
      return ['Try a faster GPU profile or fewer tokens', 'Reduce batch size if latency is priority', 'Optimize compute stage or increase GPU count']
    case 'Transfer-bound':
      return ['Compress or shrink payloads', 'Increase overlap of transfers and compute', 'Use GPUs with higher PCIe/NVLink bandwidth']
    case 'CPU-bound':
      return ['Optimize preprocess/postprocess', 'Move CPU work to GPU where possible', 'Increase CPU resources or parallelism']
    default:
      return ['Check timeline for overlapping hotspots', 'Run compare or sweeps to isolate impact', 'Consider calibration with a real trace']
  }
}
