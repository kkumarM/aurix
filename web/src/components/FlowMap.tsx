import React from 'react'
import Card from './ui/Card'
import { laneLegend } from '../styles/timelineColors'

const stageInfo: Record<string, { label: string; desc: string }> = {
  queue: { label: 'Queue', desc: 'Requests waiting for available compute slots. Long QUEUE bars → increase GPU concurrency or reduce RPS.' },
  cpu: { label: 'CPU', desc: 'Host CPU pre/post processing (tokenization, decoding). Long CPU bars → CPU is the bottleneck.' },
  cpu2: { label: 'CPU', desc: 'Postprocessing on CPU (after GPU).' },
  h2d: { label: 'H2D', desc: 'Host → Device PCIe transfer. Long H2D bars → large input payload or low PCIe bandwidth.' },
  gpu: { label: 'GPU', desc: 'On-device compute (attention, matmul). Dense GPU bars with no gaps = high utilization (good).' },
  d2h: { label: 'D2H', desc: 'Device → Host PCIe transfer. Long D2H bars → large output payload or low PCIe bandwidth.' },
}

export default function FlowMap({
  diagnostics,
  stageAggregates,
  selected,
  onSelect,
}: {
  diagnostics: any
  stageAggregates: any
  selected: string | null
  onSelect: (lane: string) => void
}) {
  const stages = ['queue', 'cpu', 'h2d', 'gpu', 'd2h']
  const shares = diagnostics?.shares || {}
  const bottleneck: string = diagnostics?.primary?.lane || ''

  const display = (lane: string) => {
    const avgMs = avgForLane(lane, stageAggregates)
    const share = shareForLane(lane, shares)
    return { avgMs, share }
  }

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-slate-100 font-semibold">Flow Map</div>
        <div className="text-xs text-slate-400">Click a stage to highlight its spans in the timeline</div>
      </div>

      <div className="flex items-start gap-1 overflow-x-auto pb-1">
        {stages.map((lane, idx) => {
          const { avgMs, share } = display(lane)
          const color = laneLegend[lane]?.color || '#94a3b8'
          const isBot = bottleneck === lane
          const isSel = selected === lane

          return (
            <React.Fragment key={lane + idx}>
              <button
                className={`flex flex-col min-w-[80px] px-2 py-2 rounded border text-left transition-all ${isSel
                    ? 'border-white/40 bg-white/10 ring-1 ring-white/20'
                    : 'border-slate-700/70 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-800/60'
                  }`}
                onClick={() => onSelect(selected === lane ? null : lane)}
              >
                {/* color dot + label */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-bold text-slate-100">{stageInfo[lane]?.label || lane.toUpperCase()}</span>
                  {isBot && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 leading-none">⚠ HOT</span>
                  )}
                </div>

                {/* avg ms */}
                {avgMs != null && (
                  <div className="text-[11px] font-mono text-slate-300">{avgMs.toFixed(1)} ms avg</div>
                )}

                {/* share bar */}
                {share != null && (
                  <div className="mt-1 w-full h-1 rounded-full bg-slate-700/60">
                    <div className="h-1 rounded-full" style={{ width: `${Math.min(100, share)}%`, backgroundColor: color, opacity: 0.85 }} />
                  </div>
                )}
                {share != null && (
                  <div className="text-[10px] text-slate-400 mt-0.5">{share}% share</div>
                )}
              </button>
              {idx < stages.length - 1 && (
                <span className="text-slate-600 self-center text-sm px-0.5">→</span>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* description */}
      <div className="text-sm text-slate-300 min-h-[1.5rem]">
        {selected
          ? stageInfo[selected]?.desc || 'Stage details'
          : bottleneck
            ? <><span className="text-red-400 font-semibold">{stageInfo[bottleneck]?.label || bottleneck.toUpperCase()}</span> is the primary bottleneck. Click it to highlight spans in the timeline.</>
            : 'Click a stage to see its meaning and highlight timeline spans.'}
      </div>

      {/* color legend strip */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-800 pt-2">
        {stages.map(lane => (
          <div key={lane} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: laneLegend[lane]?.color || '#94a3b8' }} />
            <span className="text-[10px] text-slate-400">{laneLegend[lane]?.label || lane.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function avgForLane(lane: string, aggs: any) {
  if (!aggs) return null
  const entries = Object.entries(aggs).filter(([k]) => k.toLowerCase().includes(lane.replace('2', '')))
  if (!entries.length) return null
  const sum = entries.reduce((s, [, v]: any) => s + (v.avg_ms || 0), 0)
  return sum
}

function shareForLane(lane: string, shares: any) {
  const key = lane.startsWith('cpu') ? 'cpu' : lane === 'cpu2' ? 'cpu' : lane === 'h2d' || lane === 'd2h' ? 'transfer' : lane
  if (shares && shares[key] !== undefined) return Math.round(shares[key] * 100)
  return null
}


export default function FlowMap({
  diagnostics,
  stageAggregates,
  selected,
  onSelect,
}: {
  diagnostics: any
  stageAggregates: any
  selected: string | null
  onSelect: (lane: string) => void
}) {
  const stages = ['queue', 'cpu', 'h2d', 'gpu', 'd2h', 'cpu2']
  const shares = diagnostics?.shares || {}

  const display = (lane: string) => {
    const avgMs = avgForLane(lane, stageAggregates)
    const share = shareForLane(lane, shares)
    return `${avgMs ? `${avgMs.toFixed(2)} ms avg` : ''}${avgMs && share ? ' · ' : ''}${share ? `${share}% share` : ''}`
  }

  return (
    <Card className="p-3 space-y-2">
      <div className="text-slate-100 font-semibold">Flow Map</div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {stages.map((lane, idx) => (
          <React.Fragment key={lane + idx}>
            <button
              className={`px-3 py-2 rounded border text-sm ${selected === lane ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100' : 'border-slate-700 bg-slate-900/70 text-slate-200'
                }`}
              onClick={() => onSelect(selected === lane ? null : lane)}
            >
              <div className="font-semibold">{stageInfo[lane]?.label || lane.toUpperCase()}</div>
              <div className="text-xs text-slate-400">{display(lane) || '—'}</div>
            </button>
            {idx < stages.length - 1 && <span className="text-slate-500">→</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="text-sm text-slate-200">
        {selected
          ? stageInfo[selected]?.desc || 'Stage details'
          : 'Click a stage to see its meaning and highlight timeline spans.'}
      </div>
    </Card>
  )
}

function avgForLane(lane: string, aggs: any) {
  if (!aggs) return null
  const entries = Object.entries(aggs).filter(([k]) => k.toLowerCase().includes(lane.replace('2', '')))
  if (!entries.length) return null
  const sum = entries.reduce((s, [, v]: any) => s + (v.avg_ms || 0), 0)
  return sum
}

function shareForLane(lane: string, shares: any) {
  const key = lane.startsWith('cpu') ? 'cpu' : lane === 'cpu2' ? 'cpu' : lane === 'h2d' || lane === 'd2h' ? 'transfer' : lane
  if (shares && shares[key] !== undefined) return Math.round(shares[key] * 100)
  return null
}
