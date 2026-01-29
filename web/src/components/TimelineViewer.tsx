import React, { useEffect, useMemo, useRef, useState } from 'react'
import { parseTraceToSpans, Span } from '../utils/trace'
import { timelineColors } from '../styles/timelineColors'
import { computeDiagnosticsFromSpans } from '../utils/diagnostics'

type Props = {
  runId: string
  backendUrl: string
  height?: number
  compact?: boolean
  current: number
  onCurrentChange: (v: number) => void
  zoom: number
  highlightActive: boolean
  heatOverlay: boolean
  onActiveChange?: (counters: { queued: number; gpu: number; transfer: number; cpu: number; total: number }) => void
  onMeta?: (meta: { end: number }) => void
  selected: Span | null
  onSelect: (s: Span | null) => void
  onDiagnostics?: (d: any) => void
}

export default function TimelineViewer({
  runId,
  backendUrl,
  height = 360,
  compact = false,
  current,
  onCurrentChange,
  zoom,
  highlightActive,
  heatOverlay,
  onActiveChange,
  onMeta,
  selected,
  onSelect,
  onDiagnostics,
}: Props) {
  const [spans, setSpans] = useState<Span[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [diag, setDiag] = useState<any>(null)
  const rafRef = useRef<number>()

  const endTime = useMemo(() => spans.reduce((m, s) => Math.max(m, s.endMs), 0), [spans])
  const lanes = useMemo(() => {
    const map: Record<string, Span[]> = {}
    spans.forEach((s) => {
      const lane = s.lane || 'lane'
      if (!map[lane]) map[lane] = []
      map[lane].push(s)
    })
    return map
  }, [spans])

  useEffect(() => {
    if (!runId) return
    setLoading(true)
    setError('')
    fetch(`${backendUrl}/v1/runs/${runId}/trace`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch trace')
        return r.json()
      })
      .then((json) => {
        const parsed = parseTraceToSpans(json)
        setSpans(parsed)
        onCurrentChange(0)
        onSelect(null)
        const d = computeDiagnosticsFromSpans(parsed)
        setDiag(d)
        onDiagnostics?.(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [runId, backendUrl])

  useEffect(() => {
    onMeta?.({ end: endTime })
  }, [endTime, onMeta])

  const active = useMemo(() => {
    const byLane: Record<string, number> = {}
    let total = 0
    spans.forEach((s) => {
      if (current >= s.startMs && current <= s.endMs) {
        total++
        byLane[s.lane] = (byLane[s.lane] || 0) + 1
      }
    })
    const queued = byLane['queue'] || 0
    const gpu = byLane['gpu'] || 0
    const transfer = (byLane['h2d'] || 0) + (byLane['d2h'] || 0) + (byLane['mem'] || 0)
    const cpu = byLane['cpu'] || 0
    return { total, byLane, queued, gpu, transfer, cpu }
  }, [spans, current])

  useEffect(() => {
    onActiveChange?.(active)
  }, [active, onActiveChange])

  const heat = diag?.heat || {}
  const binWidth = diag?.binWidth || 0
  const minStart = useMemo(() => spans.length ? Math.min(...spans.map((s) => s.startMs)) : 0, [spans])
  const saturation = diag?.saturation || []

  if (!runId) return null

  return (
    <div className="space-y-3">
      {loading && <div className="h-40 bg-slate-800/40 rounded animate-pulse" />}
      {error && <div className="text-red-400 text-sm">{error} — you can still download the trace.</div>}

      {!loading && spans.length > 0 && (
        <div className={`flex gap-4 ${compact ? 'items-start' : ''}`} style={{ minHeight: height }}>
          <div className="flex-1 overflow-x-auto border border-slate-800 rounded bg-slate-900/80" style={{ position: 'relative', minHeight: height }}>
            <div className="absolute right-3 top-1 text-[11px] text-slate-500">Bars = spans • Shaded = density</div>
            <Ruler end={endTime} zoom={zoom} />
            {Object.entries(lanes).map(([lane, list], idx) => (
              <LaneRow
                key={lane}
                laneIndex={idx}
                label={lane.toUpperCase()}
                spans={list}
                zoom={zoom}
                current={current}
                onSelect={onSelect}
                selected={selected}
                highlightActive={highlightActive}
                heatOverlay={heatOverlay}
                heatBins={heat[lane]}
                binWidth={binWidth}
                startOffset={minStart}
              />
            ))}
            <GridOverlay end={endTime} zoom={zoom} />
            <SaturationBands saturation={saturation} zoom={zoom} />
            {active.queued > 0 && <div className="absolute top-2 right-2 text-xs bg-indigo-400 text-slate-900 px-2 py-1 rounded">Queue forming</div>}
          </div>
          {!compact && <Details span={selected} />}
        </div>
      )}
    </div>
  )
}

function LaneRow({ label, spans, zoom, current, onSelect, selected, laneIndex, highlightActive, heatOverlay, heatBins, binWidth, startOffset }: { label: string, spans: Span[], zoom: number, current: number, onSelect: (s: Span) => void, selected: Span | null, laneIndex: number, highlightActive: boolean, heatOverlay?: boolean, heatBins?: number[], binWidth?: number, startOffset?: number }) {
  const maxEnd = spans.reduce((m, s) => Math.max(m, s.endMs), 0)
  const width = Math.max(maxEnd * zoom + 200, 600)
  return (
    <div className="relative border-t border-slate-800" style={{ height: 40, backgroundColor: laneIndex % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(15,23,42,0.2)' }}>
      <div className="sticky left-0 top-0 w-20 h-full flex items-center justify-center text-xs text-slate-300 bg-slate-900/90 backdrop-blur border-r border-slate-800 z-10">{label}</div>
      <div className="absolute left-20 right-0 top-0 h-full" style={{ width }}>
        {heatOverlay && heatBins && binWidth ? (
          <HeatOverlay bins={heatBins} binWidth={binWidth} startOffset={startOffset || 0} zoom={zoom} />
        ) : null}
        {spans.map((s, i) => {
          const left = s.startMs * zoom
          const widthPx = Math.max(2, s.durMs * zoom)
          const active = current >= s.startMs && current <= s.endMs
          const colors = timelineColors[s.lane as keyof typeof timelineColors] || timelineColors.cpu
          const isSelected = selected === s
          const baseClass = isSelected ? colors.selected : active && highlightActive ? colors.active : colors.base
          const opacity = isSelected ? 1 : active ? 1 : highlightActive ? 0.25 : 0.55
          return (
            <div
              key={i}
              className={`absolute h-6 rounded text-[10px] px-1 overflow-hidden whitespace-nowrap cursor-pointer ${baseClass}`}
              style={{ left, width: widthPx, top: 8, opacity }}
              title={`${s.name} (${s.lane}) ${s.durMs.toFixed(2)} ms`}
              onClick={() => onSelect(s)}
            >
              {s.name}
            </div>
          )
        })}
        <div className="absolute inset-y-0" style={{ left: current * zoom, width: 2, background: '#f87171' }}></div>
      </div>
    </div>
  )
}

function Ruler({ end, zoom }: { end: number, zoom: number }) {
  const ticks = []
  const step = chooseStep(end)
  for (let t = 0; t <= end; t += step) {
    ticks.push(t)
  }
  return (
    <div className="relative h-8 border-b border-slate-800">
      {ticks.map((t) => (
        <div key={t} className="absolute top-0 text-[10px] text-slate-500" style={{ left: t * zoom }}>
          <div className="w-px h-4 bg-slate-700" />
          <div className="mt-1">{t.toFixed(0)}ms</div>
        </div>
      ))}
    </div>
  )
}

function chooseStep(end: number) {
  if (end < 100) return 10
  if (end < 500) return 50
  if (end < 2000) return 100
  return 500
}

function Details({ span }: { span: Span | null }) {
  if (!span) return <div className="w-64 text-slate-400 text-sm">Click a span to see details.</div>
  return (
    <div className="w-64 bg-slate-900/60 border border-slate-800 rounded p-3 text-sm space-y-1">
      <div className="font-semibold text-slate-200">{span.name}</div>
      <div className="text-slate-400 text-xs">Lane: {span.lane}</div>
      <div>Start: {span.startMs.toFixed(2)} ms</div>
      <div>End: {span.endMs.toFixed(2)} ms</div>
      <div>Duration: {span.durMs.toFixed(2)} ms</div>
      {span.cat && <div>Cat: {span.cat}</div>}
      {span.tid !== undefined && <div>tid: {span.tid}</div>}
      {span.pid !== undefined && <div>pid: {span.pid}</div>}
    </div>
  )
}

function GridOverlay({ end, zoom }: { end: number, zoom: number }) {
  const step = chooseStep(end)
  const width = Math.max(end * zoom + 200, 600)
  const bg = `repeating-linear-gradient(to right, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent ${step * zoom}px)`
  return <div className="pointer-events-none absolute inset-0" style={{ width, backgroundImage: bg }} />
}

function HeatOverlay({ bins, binWidth, startOffset, zoom }: { bins: number[], binWidth: number, startOffset: number, zoom: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {bins.map((v, i) => {
        const left = (startOffset + i * binWidth) * zoom
        const width = binWidth * zoom
        const opacity = Math.min(0.6, v * 0.8)
        return <div key={i} className="absolute top-0 bottom-0 bg-white" style={{ left, width, opacity, backgroundColor: 'rgba(148,163,184,0.25)' }} />
      })}
    </div>
  )
}

function SaturationBands({ saturation, zoom }: { saturation: { type: 'gpu' | 'queue'; start: number; end: number }[], zoom: number }) {
  if (!saturation?.length) return null
  return (
    <div className="absolute left-20 right-0 top-0 h-6 pointer-events-none flex items-center gap-1 px-2">
      {saturation.map((w, idx) => {
        const left = w.start * zoom
        const width = Math.max(2, (w.end - w.start) * zoom)
        const color = w.type === 'gpu' ? 'rgba(52,211,153,0.25)' : 'rgba(129,140,248,0.25)'
        const border = w.type === 'gpu' ? '1px solid rgba(52,211,153,0.6)' : '1px dashed rgba(129,140,248,0.6)'
        return (
          <div key={idx} className="absolute top-1 h-4 rounded-sm" style={{ left, width, backgroundColor: color, border }} title={w.type === 'gpu' ? 'GPU saturated' : 'Queue saturation'}>
          </div>
        )
      })}
    </div>
  )
}
