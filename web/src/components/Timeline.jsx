import { useMemo } from 'react'

const laneOrder = ['queue', 'cpu', 'h2d', 'gpu', 'd2h']
const laneLabels = { queue: 'QUEUE', cpu: 'CPU', h2d: 'H2D', gpu: 'GPU', d2h: 'D2H' }
const colors = {
  queue: '#fbbf24',
  cpu: '#60a5fa',
  h2d: '#a855f7',
  d2h: '#ec4899',
  gpu: '#22d3ee',
}

export default function Timeline({ breakdown, zoom, currentTime, onSelectRequest, selectedId, highlightActive }) {
  const spansByLane = useMemo(() => {
    if (!breakdown) return {}
    const lanes = {}
    laneOrder.forEach(l => lanes[l] = [])
    breakdown.requests.forEach(req => {
      req.stages.forEach(st => {
        const lane = st.cat || 'cpu'
        if (!lanes[lane]) lanes[lane] = []
        lanes[lane].push({ ...st, requestId: req.id })
      })
    })
    return lanes
  }, [breakdown])

  const total = useMemo(() => {
    if (!breakdown) return 0
    return Math.max(...breakdown.requests.map(r => r.end_ms))
  }, [breakdown])

  if (!breakdown) return <div className="text-slate-400 text-sm">Run to see timeline.</div>

  const width = Math.max(total * zoom, 600)

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-900/60">
        <div className="min-w-full" style={{ width }}>
          {laneOrder.map(lane => (
            <LaneRow key={lane} label={laneLabels[lane]} spans={spansByLane[lane] || []} width={width} zoom={zoom} currentTime={currentTime} onSelect={onSelectRequest} selectedId={selectedId} highlightActive={highlightActive} />
          ))}
        </div>
      </div>
    </div>
  )
}

function LaneRow({ label, spans, width, zoom, currentTime, onSelect, selectedId, highlightActive }) {
  return (
    <div className="relative border-b border-slate-800 last:border-b-0" style={{ height: 36 }}>
      <div className="absolute left-0 top-0 w-20 h-full flex items-center justify-center text-xs text-slate-400 border-r border-slate-800">{label}</div>
      <div className="absolute left-20 right-0 top-0 h-full">
        {spans?.map((s, idx) => {
          const left = s.start_ms * zoom
          const widthPx = Math.max(2, (s.end_ms - s.start_ms) * zoom)
          const active = currentTime >= s.start_ms && currentTime <= s.end_ms
          const isSelected = selectedId === s.requestId
          const opacity = highlightActive ? (active ? 1 : 0.3) : 0.9
          return (
            <div
              key={idx}
              className="absolute h-6 rounded text-[10px] px-1 overflow-hidden whitespace-nowrap cursor-pointer"
              style={{ left, width: widthPx, top: 5, background: colors[s.cat] || '#22d3ee', opacity, border: isSelected ? '2px solid white' : '1px solid rgba(0,0,0,0.2)' }}
              title={`${s.name} [req ${s.requestId}] ${(s.end_ms - s.start_ms).toFixed(2)} ms`}
              onClick={() => onSelect(s.requestId)}
            >
              {s.name}
            </div>
          )
        })}
        <div className="absolute inset-y-0" style={{ left: currentTime * zoom, width: 2, background: '#f87171' }}></div>
      </div>
    </div>
  )
}
