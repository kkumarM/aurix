import React from 'react'

type Props = {
  playing: boolean
  onTogglePlay: () => void
  current: number
  end: number
  onScrub: (v: number) => void
  speed: number
  onSpeed: (v: number) => void
  zoom: number
  onZoom: (v: number) => void
  highlight: boolean
  onHighlight: (v: boolean) => void
  counters: { queued: number; gpu: number; transfer: number; cpu: number; total: number }
  onToggleInspector: () => void
}

export default function TimelineControls({
  playing,
  onTogglePlay,
  current,
  end,
  onScrub,
  speed,
  onSpeed,
  zoom,
  onZoom,
  highlight,
  onHighlight,
  counters,
  onToggleInspector,
}: Props) {
  return (
    <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur px-3 py-2 border-b border-slate-800 flex flex-wrap items-center gap-3 text-sm">
      <button className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-semibold" onClick={onTogglePlay}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <input
        type="range"
        min={0}
        max={end || 1}
        value={current}
        onChange={(e) => onScrub(parseFloat(e.target.value))}
        className="flex-1"
      />
      <select className="w-20 h-10 rounded bg-slate-900/70 text-slate-100 border border-slate-700" value={speed} onChange={(e) => onSpeed(parseFloat(e.target.value))}>
        {[0.5, 1, 2, 4].map((s) => (
          <option key={s} value={s}>{s}x</option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Zoom</span>
        <input type="range" min={0.1} max={2} step={0.1} value={zoom} onChange={(e) => onZoom(parseFloat(e.target.value))} />
      </div>
      <label className="flex items-center gap-1 text-xs text-slate-300">
        <input type="checkbox" checked={highlight} onChange={(e) => onHighlight(e.target.checked)} />
        Highlight active
      </label>
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <span>Queued {counters.queued}</span>
        <span>GPU {counters.gpu}</span>
        <span>Xfer {counters.transfer}</span>
        <span>CPU {counters.cpu}</span>
      </div>
      <button className="ml-auto px-3 py-1 rounded border border-slate-700 text-slate-200" onClick={onToggleInspector}>
        Inspector
      </button>
    </div>
  )
}
