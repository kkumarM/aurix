import { useEffect, useState } from 'react'
import Card from './ui/Card'

export default function RunComparisonTable({ baseRunId, compareRunId, backendUrl }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!baseRunId || !compareRunId) return

    let cancelled = false
    setLoading(true)
    setError('')

    fetch(`${backendUrl}/v1/runs/compare?base=${baseRunId}&compare=${compareRunId}`)
      .then(res => res.ok ? res.json() : res.json().then(b => Promise.reject(b.error || 'Failed to compare')))
      .then(json => {
        if (!cancelled) setData(json)
      })
      .catch(err => {
        if (!cancelled) setError(typeof err === 'string' ? err : err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [baseRunId, compareRunId, backendUrl])

  if (loading) return <div className="text-sm text-slate-400 animate-pulse">Loading comparison...</div>
  if (error) return <div className="text-sm text-red-400">Error: {error}</div>
  if (!data) return null

  return (
    <Card className="p-4 space-y-3 bg-slate-900/40">
      <div className="text-sm font-semibold text-slate-200">Comparison Metrics (Run B vs Run A)</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Throughput" delta={data.delta_throughput_rps} pct={data.pct_throughput} unit="rps" invertColors={false} />
        <MetricCard label="p50 Latency" delta={data.delta_p50_ms} pct={null} unit="ms" invertColors={true} />
        <MetricCard label="p90 Latency" delta={data.delta_p90_ms} pct={null} unit="ms" invertColors={true} />
        <MetricCard label="p99 Latency" delta={data.delta_p99_ms} pct={data.pct_p99} unit="ms" invertColors={true} />
        <MetricCard label="Queue Time" delta={data.delta_queue_ms} pct={null} unit="ms" invertColors={true} />
        <MetricCard label="GPU Util" delta={data.delta_gpu_util_percent} pct={null} unit="%" invertColors={false} />
      </div>
    </Card>
  )
}

function MetricCard({ label, delta, pct, unit, invertColors }) {
  // invertColors: true means lower is better (e.g. latency)
  const isPositive = delta > 0
  const isNegative = delta < 0
  const isZero = delta === 0

  let colorClass = 'text-slate-400'
  if (isPositive) {
    colorClass = invertColors ? 'text-red-400' : 'text-emerald-400'
  } else if (isNegative) {
    colorClass = invertColors ? 'text-emerald-400' : 'text-red-400'
  }

  const sign = isPositive ? '+' : ''
  const displayDelta = `${sign}${delta.toFixed(2)} ${unit}`
  const displayPct = pct !== null && pct !== undefined ? `(${sign}${pct.toFixed(1)}%)` : ''

  return (
    <div className="bg-slate-950/50 border border-slate-800 rounded p-3 flex flex-col justify-center">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-sm font-mono font-medium ${colorClass}`}>
        {isZero ? 'No change' : (
          <div className="flex flex-col">
            <span>{displayDelta}</span>
            {displayPct && <span className="text-xs opacity-80">{displayPct}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
