import React from 'react'
import Card from './ui/Card'
import Button from './ui/Button'
import { Diagnostics } from '../utils/diagnostics'

export default function ExplainPanel({ summary, diagnostics, onClose }: { summary: any, diagnostics: Diagnostics | null, onClose: () => void }) {
  const text = buildExplanation(summary, diagnostics)
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-slate-100 font-semibold">Explain this run</div>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      <div className="space-y-2 text-sm text-slate-200">
        <Section title="What happened" body={text.what} />
        <Section title="Where time went" body={text.where} />
        <Section title="Why p99 increased" body={text.why} />
        <Section title="What to try next" body={text.next.join('\n')} />
      </div>
    </Card>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-slate-100 font-semibold">{title}</div>
      <div className="text-slate-300 whitespace-pre-line">{body}</div>
    </div>
  )
}

function buildExplanation(summary: any, diagnostics: Diagnostics | null) {
  const p50 = summary?.p50_ms || summary?.p50
  const p99 = summary?.p99_ms || summary?.p99
  const queue = summary?.queue_wait_ms || summary?.avg_queue_wait_ms
  const gpu = summary?.gpu_util || summary?.compute_busy
  const throughput = summary?.throughput
  const primary = diagnostics?.primary || 'Mixed'

  const what = `Run completed with throughput ${fmt(throughput)} req/s and p99 ${fmt(p99)} ms. Primary diagnosis: ${primary}.`
  const where = `Queue: ${fmt(queue)} ms avg. Compute busy: ${fmt(gpu)}%. p50: ${fmt(p50)} ms.`
  const why = primary === 'Queue-bound'
    ? 'p99 rose because requests are waiting in queue; arrivals exceed available compute/concurrency.'
    : primary === 'GPU-bound'
      ? 'p99 rose because the GPU is near saturation; compute spans dominate tail latency.'
      : primary === 'Transfer-bound'
        ? 'p99 rose because transfers consume a large share and have limited overlap.'
        : primary === 'CPU-bound'
          ? 'p99 rose because CPU pre/post stages dominate when load increases.'
          : 'p99 rose due to a mix of queueing and stage overlap limits.'

  const next = recommend(primary)

  return { what, where, why, next }
}

function recommend(primary: string) {
  switch (primary) {
    case 'Queue-bound':
      return ['Lower RPS or increase GPUs/concurrency', 'Reduce per-request work (tokens/batch)', 'Smooth traffic bursts (lower jitter)']
    case 'GPU-bound':
      return ['Reduce tokens or batch', 'Try a faster GPU profile', 'Add GPUs or lower concurrency to reduce contention']
    case 'Transfer-bound':
      return ['Shrink or compress payloads', 'Increase overlap of transfers and compute', 'Use higher-bandwidth GPUs/links if possible']
    case 'CPU-bound':
      return ['Optimize preprocess/postprocess', 'Parallelize CPU work or offload to GPU', 'Profile CPU hotspots']
    default:
      return ['Inspect timeline for hotspots', 'Compare runs or run sweeps to isolate impact', 'Calibrate with a real trace if available']
  }
}

function fmt(v: any) {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'number') return v.toFixed(2)
  return String(v)
}
