import React from 'react'

export default function AboutAurix() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-slate-200">
      <header className="flex items-center gap-3">
        <AurixLogo />
        <div>
          <div className="text-2xl font-semibold">AURIX — GPU Workload Performance Explorer</div>
          <div className="text-sm text-slate-400">Workload-level reasoning for GPU systems</div>
        </div>
      </header>

      <p className="text-slate-300 leading-relaxed">
        Aurix is a workload-level performance reasoning tool designed to help engineers understand, explain, and predict GPU system behavior before and after deployment.
      </p>

      <Section title="What Aurix Is" bullets={[
        'Scenario-driven performance modeling',
        'Timeline-based system visualization',
        'Queueing, overlap, and saturation analysis',
        'What-if analysis and capacity planning',
        'Calibration using Nsight Systems traces',
      ]} />

      <Section title="What Aurix Is Not" bullets={[
        'Not a CUDA or GPU instruction simulator',
        'Not a kernel-level optimizer',
        'Not a benchmark replacement',
        'Not a profiler',
      ]} tone="negative" />

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">How to Use Aurix</h3>
        <ol className="list-decimal list-inside space-y-1 text-slate-300">
          <li>Define workload intent (RPS, concurrency, pipeline)</li>
          <li>Run simulation and inspect timeline</li>
          <li>Identify bottlenecks and saturation</li>
          <li>Compare GPU profiles or configurations</li>
          <li>(Optional) Calibrate with real Nsight trace</li>
        </ol>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Design Philosophy</h3>
        <p className="text-slate-300 leading-relaxed">
          Aurix prioritizes explainability over strict realism, focusing on system behavior rather than kernel microarchitecture. Visualization is used as a reasoning tool to reveal queueing, overlap, and saturation so teams can make confident decisions quickly.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">When to use Aurix vs Nsight</h3>
        <p className="text-slate-300 leading-relaxed">
          Use Aurix for rapid scenario exploration, capacity planning, and communicating system-level behavior. Use Nsight Systems for detailed profiling and low-level validation; you can import Nsight traces into Aurix for calibration and comparison.
        </p>
      </div>
    </div>
  )
}

function Section({ title, bullets, tone = 'neutral' }: { title: string; bullets: string[]; tone?: 'neutral' | 'negative' }) {
  const bulletColor = tone === 'negative' ? 'text-red-300' : 'text-emerald-200'
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="list-disc list-inside space-y-1 text-slate-300">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 items-start">
            <span className={`w-2 h-2 mt-2 rounded-full ${tone === 'negative' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
            <span className={tone === 'negative' ? 'text-slate-300' : 'text-slate-200'}>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AurixLogo() {
  return (
    <svg width="72" height="72" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow" aria-label="Aurix logo">
      <path d="M60 4 L8 116 H112 Z" fill="none" stroke="#34D399" strokeWidth="8" strokeLinejoin="round" />
      <path d="M25 82 H95" stroke="#34D399" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 66 H88" stroke="#34D399" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 50 H82" stroke="#34D399" strokeWidth="4" strokeLinecap="round" />
      <path d="M48 34 H76" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}
