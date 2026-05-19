import React from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import { Diagnostics } from '../utils/diagnostics'

type Props = {
  diagnostics: Diagnostics | null
  summary?: any
  scenario?: any
  compact?: boolean
  onExplain?: () => void
}

export default function DecisionSummary({ diagnostics, summary, scenario, compact = false, onExplain }: Props) {
  if (!diagnostics) return null

  const model = buildDecisionModel(diagnostics, summary, scenario)

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm">
        <span className="text-slate-100 font-semibold">Decision Summary</span>
        <Badge tone={model.feasibilityTone}>{model.feasibility}</Badge>
        <Badge tone="neutral">{model.primary}</Badge>
        <span className="text-slate-300">{model.explanation}</span>
        <span className="ml-auto text-xs text-slate-400">{model.confidence}</span>
      </div>
    )
  }

  return (
    <Card className="p-5 space-y-4 border-emerald-500/20 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-slate-100 font-semibold text-xl">Decision Summary</div>
        <Badge tone={model.feasibilityTone}>{model.feasibility}</Badge>
        <Badge tone="neutral">{model.primary}</Badge>
        <span className="text-xs text-slate-400">{model.confidence}</span>
        {onExplain && <button className="ml-auto text-emerald-300 text-sm" onClick={onExplain}>Explain this run</button>}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Feasibility" value={model.feasibility} tone={model.feasibilityTone} />
        <StatCard label="Primary bottleneck" value={model.primary} />
        <StatCard label="Observed p99" value={model.observedP99} />
        <StatCard label="Throughput" value={model.throughput} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
        {model.explanation}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-100">Recommended next actions</div>
        <ul className="space-y-2 text-sm text-slate-300">
          {model.actions.map((action) => (
            <li key={action} className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        {model.targetP99 && <span>Target p99: {model.targetP99}</span>}
        <span>Queue share {pct(diagnostics.shares.queue)}</span>
        <span>GPU busy {fmtNumber(diagnostics.gpuBusy, 0)}%</span>
        <span>Transfer share {pct(diagnostics.shares.transfer)}</span>
      </div>
    </Card>
  )
}

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'success' | 'danger' | 'warning' | 'neutral' }) {
  const valueTone = tone === 'success'
    ? 'text-emerald-200'
    : tone === 'danger'
      ? 'text-red-200'
      : tone === 'warning'
        ? 'text-amber-100'
        : 'text-slate-100'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${valueTone}`}>{value}</div>
    </div>
  )
}

function buildDecisionModel(diagnostics: Diagnostics, summary?: any, scenario?: any) {
  const primary = diagnostics.primary === 'Balanced' ? 'Mixed' : diagnostics.primary
  const targetP99Ms = firstNumber(
    scenario?.analysis?.target_p99_ms,
    scenario?.goal?.target_p99_ms,
    scenario?.target_p99_ms,
    scenario?.workload?.target_p99_ms,
  )
  const observedP99Ms = firstNumber(summary?.p99_ms, summary?.p99)
  const throughputRps = firstNumber(summary?.throughput_rps, summary?.throughput)
  const requestedRps = firstNumber(scenario?.workload?.rps)
  const calibrated = Boolean(scenario?.meta?.calibration || scenario?.analysis?.calibrated)

  const feasibility = computeFeasibility({
    targetP99Ms,
    observedP99Ms,
    throughputRps,
    requestedRps,
  })

  return {
    primary,
    feasibility: feasibility.label,
    feasibilityTone: feasibility.tone,
    confidence: calibrated ? 'Calibrated' : 'Estimated',
    observedP99: observedP99Ms ? `${fmtNumber(observedP99Ms)} ms` : '—',
    targetP99: targetP99Ms ? `${fmtNumber(targetP99Ms)} ms` : '',
    throughput: throughputRps ? `${fmtNumber(throughputRps)} rps` : '—',
    explanation: explain(primary, diagnostics, observedP99Ms, requestedRps),
    actions: recommend(primary),
  }
}

function computeFeasibility({
  targetP99Ms,
  observedP99Ms,
  throughputRps,
  requestedRps,
}: {
  targetP99Ms?: number
  observedP99Ms?: number
  throughputRps?: number
  requestedRps?: number
}) {
  if (!targetP99Ms || !observedP99Ms) {
    return { label: 'Estimated only', tone: 'neutral' as const }
  }

  const latencyRatio = observedP99Ms / targetP99Ms
  const throughputRatio = requestedRps ? (throughputRps || 0) / requestedRps : 1

  if (latencyRatio <= 0.9 && throughputRatio >= 0.95) {
    return { label: 'Feasible', tone: 'success' as const }
  }
  if (latencyRatio <= 1.1 && throughputRatio >= 0.85) {
    return { label: 'Risky', tone: 'warning' as const }
  }
  return { label: 'Not feasible', tone: 'danger' as const }
}

function explain(primary: string, diagnostics: Diagnostics, observedP99Ms?: number, requestedRps?: number) {
  const p99 = observedP99Ms ? ` Observed p99 is ${fmtNumber(observedP99Ms)} ms.` : ''
  const rps = requestedRps ? ` at ${fmtNumber(requestedRps)} rps` : ''

  switch (primary) {
    case 'Queue-bound':
      return `The workload is queue-bound${rps} because requests arrive faster than the configured GPU concurrency can drain them.${p99}`
    case 'GPU-bound':
      return `The workload is GPU-bound because compute dominates service time and GPU busy is ${fmtNumber(diagnostics.gpuBusy, 0)}%.${p99}`
    case 'Transfer-bound':
      return `The workload is transfer-bound because H2D and D2H activity consume a large share of time and limit overlap.${p99}`
    case 'CPU-bound':
      return `The workload is CPU-bound because preprocess and postprocess stages dominate end-to-end time.${p99}`
    default:
      return `The workload has mixed bottlenecks, so no single stage dominates. Use the timeline to separate queueing, transfer, and compute effects.${p99}`
  }
}

function recommend(primary: string) {
  switch (primary) {
    case 'Queue-bound':
      return [
        'Reduce request rate or add GPU capacity.',
        'Increase concurrency if the GPU still has headroom.',
        'Run an RPS sweep and inspect the timeline for queue buildup.',
      ]
    case 'GPU-bound':
      return [
        'Switch GPU profile or add more GPUs.',
        'Reduce per-request compute such as tokens or batch pressure.',
        'Run Compare or Sweeps to find the best latency-throughput tradeoff.',
      ]
    case 'Transfer-bound':
      return [
        'Reduce transfer size or compress payloads.',
        'Increase overlap between transfers and compute.',
        'Inspect the timeline to confirm H2D or D2H is the limiting lane.',
      ]
    case 'CPU-bound':
      return [
        'Optimize preprocess or postprocess stages.',
        'Increase CPU-side parallelism or move work onto the GPU.',
        'Inspect the timeline to confirm CPU stages dominate before tuning GPUs.',
      ]
    default:
      return [
        'Inspect the timeline to isolate the dominant lane.',
        'Run Compare or Sweeps to test which parameter changes matter most.',
        'Calibrate with a real trace when you have one.',
      ]
  }
}

function firstNumber(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return num
  }
  return undefined
}

function fmtNumber(value?: number, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return Number(value).toFixed(digits)
}

function pct(value: number) {
  return `${fmtNumber((value || 0) * 100, 0)}%`
}
