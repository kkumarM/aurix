import { parseTraceToSpans, Span } from './trace'

export type Diagnostics = {
  primary: 'GPU-bound' | 'Transfer-bound' | 'CPU-bound' | 'Queue-bound' | 'Balanced'
  evidence: string[]
  shares: { queue: number; gpu: number; transfer: number; cpu: number }
  gpuBusy: number
  transferBusy: number
  heat: Record<string, number[]>
  binWidth: number
  saturation: { type: 'gpu' | 'queue'; start: number; end: number }[]
}

export function computeDiagnosticsFromTrace(json: any): Diagnostics | null {
  const spans = parseTraceToSpans(json)
  if (!spans.length) return null
  return computeDiagnosticsFromSpans(spans)
}

export function computeDiagnosticsFromSpans(spans: Span[]): Diagnostics {
  const start = Math.min(...spans.map((s) => s.startMs))
  const end = Math.max(...spans.map((s) => s.endMs))
  const window = Math.max(1, end - start)
  const totalDur = spans.reduce((s, p) => s + p.durMs, 0)
  const laneDur: Record<string, number> = {}
  spans.forEach((s) => {
    laneDur[s.lane] = (laneDur[s.lane] || 0) + s.durMs
  })
  const queueShare = (laneDur['queue'] || 0) / totalDur
  const gpuShare = (laneDur['gpu'] || 0) / totalDur
  const transferShare = ((laneDur['h2d'] || 0) + (laneDur['d2h'] || 0) + (laneDur['mem'] || 0)) / totalDur
  const cpuShare = (laneDur['cpu'] || 0) / totalDur

  const bins = 80
  const binWidth = window / bins
  const heat: Record<string, number[]> = {}
  const gpuUse: number[] = Array(bins).fill(0)
  const queueUse: number[] = Array(bins).fill(0)
  const transferUse: number[] = Array(bins).fill(0)

  spans.forEach((s) => {
    const lane = s.lane
    if (!heat[lane]) heat[lane] = Array(bins).fill(0)
    const startBin = Math.floor((s.startMs - start) / binWidth)
    const endBin = Math.floor((s.endMs - start) / binWidth)
    for (let b = Math.max(0, startBin); b <= Math.min(bins - 1, endBin); b++) {
      const binStart = start + b * binWidth
      const binEnd = binStart + binWidth
      const overlap = Math.max(0, Math.min(s.endMs, binEnd) - Math.max(s.startMs, binStart))
      if (overlap > 0) {
        const ratio = Math.min(1, overlap / binWidth)
        heat[lane][b] = Math.min(1, heat[lane][b] + ratio) // cap to 1 for occupancy
        if (lane === 'gpu') gpuUse[b] = Math.min(1, gpuUse[b] + ratio)
        if (lane === 'queue') queueUse[b] = Math.min(1, queueUse[b] + ratio)
        if (lane === 'h2d' || lane === 'd2h' || lane === 'mem') transferUse[b] = Math.min(1, transferUse[b] + ratio)
      }
    }
  })

  const gpuBusy = avg(gpuUse) * 100
  const transferBusy = avg(transferUse) * 100

  const saturation: { type: 'gpu' | 'queue'; start: number; end: number }[] = []
  collectWindows(gpuUse, binWidth, start, 0.85, 300, 'gpu', saturation)
  collectWindows(queueUse, binWidth, start, 0.05, 300, 'queue', saturation)

  const primary = classify({ queueShare, gpuShare, transferShare, cpuShare, gpuBusy, transferBusy })
  const evidence = buildEvidence({ queueShare, gpuShare, transferShare, cpuShare, gpuBusy, transferBusy })

  return {
    primary,
    evidence,
    shares: { queue: queueShare, gpu: gpuShare, transfer: transferShare, cpu: cpuShare },
    gpuBusy,
    transferBusy,
    heat,
    binWidth,
    saturation,
  }
}

function avg(arr: number[]) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function collectWindows(
  arr: number[],
  binWidth: number,
  start: number,
  threshold: number,
  minMs: number,
  type: 'gpu' | 'queue',
  out: { type: 'gpu' | 'queue'; start: number; end: number }[],
) {
  let on = false
  let s = 0
  for (let i = 0; i < arr.length; i++) {
    const active = arr[i] >= threshold
    if (active && !on) {
      on = true
      s = i
    } else if (!active && on) {
      const e = i
      const dur = (e - s) * binWidth
      if (dur >= minMs) out.push({ type, start: start + s * binWidth, end: start + e * binWidth })
      on = false
    }
  }
  if (on) {
    const dur = (arr.length - s) * binWidth
    if (dur >= minMs) out.push({ type, start: start + s * binWidth, end: start + arr.length * binWidth })
  }
}

function classify({ queueShare, gpuShare, transferShare, cpuShare, gpuBusy, transferBusy }) {
  if (queueShare > Math.max(gpuShare, transferShare, cpuShare) && queueShare > 0.35) return 'Queue-bound'
  if (gpuShare > 0.45 || gpuBusy > 85) return 'GPU-bound'
  if (transferShare > 0.35 || transferBusy > 70) return 'Transfer-bound'
  if (cpuShare > 0.4) return 'CPU-bound'
  return 'Balanced'
}

function buildEvidence({ queueShare, gpuShare, transferShare, cpuShare, gpuBusy, transferBusy }) {
  const e: string[] = []
  e.push(`GPU busy ${gpuBusy.toFixed(0)}%`)
  e.push(`Queue share ${(queueShare * 100).toFixed(0)}%`)
  e.push(`Transfer share ${(transferShare * 100).toFixed(0)}%`)
  e.push(`CPU share ${(cpuShare * 100).toFixed(0)}%`)
  e.push(`GPU share ${(gpuShare * 100).toFixed(0)}%`)
  return e
}
