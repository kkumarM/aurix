import React from 'react'
import Card from './ui/Card'

const stageInfo: Record<string, { label: string; desc: string }> = {
  queue: { label: 'Queue', desc: 'Requests waiting for available compute slots.' },
  cpu: { label: 'CPU', desc: 'Pre/Post processing on CPU.' },
  cpu2: { label: 'CPU', desc: 'Postprocessing on CPU (after GPU).' },
  h2d: { label: 'H2D', desc: 'Host → Device transfer; time scales with input bytes ÷ H2D bandwidth.' },
  gpu: { label: 'GPU', desc: 'Compute kernels; tokens × ms_per_token or fixed compute.' },
  d2h: { label: 'D2H', desc: 'Device → Host transfer; time scales with output bytes ÷ D2H bandwidth.' },
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
              className={`px-3 py-2 rounded border text-sm ${
                selected === lane ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100' : 'border-slate-700 bg-slate-900/70 text-slate-200'
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
