import { useState } from 'react'
import ResultCards from './ResultCards'
import DiagnosisCard from './DiagnosisCard'
import Card from './ui/Card'
import Button from './ui/Button'

const gpuOptions = ['A10G', 'L4', 'A100', 'H100', 'Custom']

export default function RunResults({ run, loading, error, onOpenTimeline, diagnostics, backendUrl, addRun, setRun, setActiveTab }) {
  const [whatIfProfile, setWhatIfProfile] = useState('H100')
  const [whatIfRun, setWhatIfRun] = useState(null)
  const [busy, setBusy] = useState(false)
  const [reportParams, setReportParams] = useState({ rps: 10, sla: 200 })
  const [explanation, setExplanation] = useState('')

  if (error) return <div className="text-red-400">{error}</div>
  if (loading) return <div className="text-slate-300">Running simulation…</div>
  return (
    <div className="space-y-3">
      <DiagnosisCard diagnostics={diagnostics} />
      <div className="flex flex-wrap gap-2 items-center">
        <div className="text-sm text-slate-300">GPU what-if:</div>
        <select className="h-10 px-3 rounded border border-slate-700 bg-slate-900 text-slate-100" value={whatIfProfile} onChange={(e) => setWhatIfProfile(e.target.value)}>
          {gpuOptions.map((g) => <option key={g}>{g}</option>)}
        </select>
        <Button variant="secondary" disabled={busy || !run} onClick={() => duplicateAndRun(run, whatIfProfile, { setBusy, setWhatIfRun, addRun, setRun, setActiveTab, backendUrl })}>
          Duplicate & Switch GPU
        </Button>
        <Button variant="ghost" disabled={busy || !run} onClick={() => setExplanation(buildExplanation(run, diagnostics))}>
          Explain this run
        </Button>
        <Button variant="ghost" disabled={busy || !run} onClick={() => exportReport(run, reportParams)}>
          Export Report
        </Button>
        <label className="text-xs text-slate-400 flex items-center gap-1">
          Target RPS
          <input className="w-16 h-8 px-2 rounded bg-slate-900 border border-slate-700 text-slate-100" type="number" value={reportParams.rps} onChange={(e) => setReportParams((p) => ({ ...p, rps: parseFloat(e.target.value) || 0 }))} />
          SLA p99 (ms)
          <input className="w-16 h-8 px-2 rounded bg-slate-900 border border-slate-700 text-slate-100" type="number" value={reportParams.sla} onChange={(e) => setReportParams((p) => ({ ...p, sla: parseFloat(e.target.value) || 0 }))} />
        </label>
      </div>

      <ResultCards summary={run?.summary} runId={run?.id} trace={run?.trace} onOpenTimeline={onOpenTimeline} />

      {whatIfRun && (
        <Card className="p-3 space-y-2">
          <div className="text-slate-200 font-semibold">What-if vs Current</div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-900/60 border border-slate-800 rounded p-3">
              <div className="text-slate-400 text-xs">Current GPU</div>
              <SummaryLines summary={run.summary} label={run.scenario?.target?.name} />
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded p-3">
              <div className="text-slate-400 text-xs">What-if GPU</div>
              <SummaryLines summary={whatIfRun.summary} label={whatIfRun.scenario?.target?.name} />
              <button className="text-emerald-300 text-xs mt-2" onClick={() => { setRun(whatIfRun); setActiveTab('timeline') }}>Open timeline</button>
            </div>
          </div>
        </Card>
      )}

      {explanation && (
        <Card className="p-3 text-sm text-slate-200 space-y-2">
          <div className="font-semibold">Explanation</div>
          <p className="text-slate-300 whitespace-pre-line">{explanation}</p>
        </Card>
      )}
    </div>
  )
}

function SummaryLines({ summary, label }) {
  if (!summary) return <div className="text-slate-500 text-xs">No data</div>
  return (
    <ul className="space-y-1">
      <li className="text-slate-200">{label}</li>
      <li className="text-slate-300">Throughput: {fmt(summary.throughput)}</li>
      <li className="text-slate-300">p50 / p99: {fmt(summary.p50_ms || summary.p50)} / {fmt(summary.p99_ms || summary.p99)} ms</li>
      <li className="text-slate-300">Queue wait: {fmt(summary.queue_wait_ms || summary.avg_queue_wait_ms)} ms</li>
      <li className="text-slate-300">Compute busy: {fmt(summary.gpu_util || summary.compute_busy)}%</li>
    </ul>
  )
}

function fmt(v) {
  if (v === undefined || v === null || Number.isNaN(v)) return '—'
  return typeof v === 'number' ? v.toFixed(2) : v
}

async function duplicateAndRun(run, profile, ctx) {
  if (!run) return
  const { setBusy, setWhatIfRun, addRun, setRun, setActiveTab, backendUrl } = ctx
  setBusy(true)
  try {
    const scenario = structuredClone(run.scenario || {})
    scenario.target = { ...(scenario.target || {}), name: profile }
    const res = await fetch(`${backendUrl}/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    })
    if (!res.ok) throw new Error('Run failed')
    const data = await res.json()
    const runId = data.run_id
    const summary = data.summary
    const breakdown = data.breakdown || (await (await fetch(`${backendUrl}/v1/runs/${runId}/breakdown`)).json())
    const tracePath = data.artifacts?.trace
    const newRun = { id: runId, summary, trace: tracePath, breakdown, scenario }
    setWhatIfRun(newRun)
    addRun(newRun)
    setRun(newRun)
    setActiveTab('results')
  } catch (e) {
    console.error(e)
  } finally {
    setBusy(false)
  }
}

function exportReport(run, params) {
  if (!run?.summary) return
  const perGpu = run.summary.throughput || 0
  const required = perGpu > 0 ? Math.ceil((params.rps || 0) / (perGpu * 0.85)) : 1
  const util = perGpu > 0 ? Math.min(100, ((params.rps || 0) / (required * perGpu)) * 100) : 0
  const risks = util > 85 ? ['High utilization risk'] : ['Moderate headroom']
  const report = {
    target_rps: params.rps,
    sla_p99_ms: params.sla,
    throughput_per_gpu: perGpu,
    recommended_gpus: required,
    expected_utilization_pct: util,
    risks,
  }
  download(JSON.stringify(report, null, 2), 'application/json', 'aurix-capacity.json')
  const md = [
    '# Aurix Capacity Report',
    `Target RPS: ${params.rps}`,
    `SLA p99 (ms): ${params.sla}`,
    `Per-GPU throughput (obs): ${fmt(perGpu)}`,
    `Recommended GPUs: ${required}`,
    `Expected utilization: ${util.toFixed(1)}%`,
    `Risks: ${risks.join(', ')}`,
  ].join('\n')
  download(md, 'text/markdown', 'aurix-capacity.md')
}

function download(text, mime, name) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function buildExplanation(run, diagnostics) {
  const s = run?.summary || {}
  const p99 = s.p99_ms || s.p99
  const queue = s.queue_wait_ms || s.avg_queue_wait_ms
  const gpu = s.gpu_util || s.compute_busy
  const primary = diagnostics?.primary || 'Balanced'
  const lines = []
  lines.push(`This run appears ${primary.toLowerCase()}.`)
  if (p99) lines.push(`Observed p99 latency is ${fmt(p99)} ms.`)
  if (queue) lines.push(`Average queue wait is ${fmt(queue)} ms, indicating admission pressure.`)
  if (gpu) lines.push(`Compute busy is ${fmt(gpu)}%, suggesting ${gpu > 85 ? 'near-saturation' : 'headroom'}.`)
  lines.push('Suggestions:')
  if (primary === 'Queue-bound') lines.push('- Increase concurrency or add GPUs to reduce queueing.')
  if (primary === 'GPU-bound') lines.push('- Reduce batch or choose a faster GPU profile.')
  if (primary === 'Transfer-bound') lines.push('- Reduce input/output sizes or improve overlap.')
  if (primary === 'CPU-bound') lines.push('- Optimize preprocess/postprocess or shift work to GPU.')
  lines.push('- Re-run with the wizard presets to compare effects.')
  return lines.join('\n')
}
