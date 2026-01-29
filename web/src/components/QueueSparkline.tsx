import React from 'react'

export type Sample = { t: number; depth: number }

export default function QueueSparkline({ samples }: { samples: Sample[] }) {
  if (!samples.length) return <div className="text-xs text-slate-500">Queue depth unavailable</div>
  const maxDepth = Math.max(...samples.map(s => s.depth), 1)
  const width = 180
  const height = 40
  const points = samples.map((s, i) => {
    const x = (i / Math.max(1, samples.length - 1)) * width
    const y = height - (s.depth / maxDepth) * height
    return `${x},${y}`
  }).join(' ')
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span>Queue depth</span>
      <svg width={width} height={height} className="border border-slate-800 rounded bg-slate-900/60">
        <polyline points={points} fill="none" stroke="#fbbf24" strokeWidth="2" />
      </svg>
      <span className="text-slate-500">max {maxDepth}</span>
    </div>
  )
}
