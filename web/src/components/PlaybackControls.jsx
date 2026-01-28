import { useEffect, useRef } from 'react'

export default function PlaybackControls({ duration, currentTime, setCurrentTime, playing, setPlaying }) {
  const rafRef = useRef()

  useEffect(() => {
    if (!playing) return
    const tick = (ts) => {
      setCurrentTime((prev) => {
        const next = prev + 16
        if (next > duration) {
          setPlaying(false)
          return duration
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, duration, setCurrentTime, setPlaying])

  return (
    <div className="flex items-center gap-3 text-sm">
      <button className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-semibold"
        onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
      <input type="range" min={0} max={duration} value={currentTime}
        onChange={(e) => { setCurrentTime(parseFloat(e.target.value)); setPlaying(false) }}
        className="w-full" />
      <div className="text-slate-400 text-xs w-24 text-right">{currentTime.toFixed(0)} ms</div>
    </div>
  )
}
