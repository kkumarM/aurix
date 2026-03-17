import React from 'react'
import Card from './ui/Card'
import Button from './ui/Button'
import QuickQuestions from './QuickQuestions'

export default function StartHere({ onBuild, onRun, onTimeline, onCompare, onUploadTrace }) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card className="p-5 space-y-4 text-center">
        <div className="text-2xl font-semibold text-slate-100">Start with Aurix</div>
        <div className="text-slate-300 text-sm">
          Aurix helps you model GPU workload behavior, inspect timelines, compare configurations, and reason about bottlenecks before or after running on real hardware.
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Card className="p-3 space-y-2">
            <div className="text-slate-200 font-semibold">Build a scenario</div>
            <div className="text-xs text-slate-400">Describe workload, GPU, and pipeline (or use Wizard).</div>
            <Button variant="secondary" onClick={onBuild}>Open builder</Button>
          </Card>
          <Card className="p-3 space-y-2">
            <div className="text-slate-200 font-semibold">Run a simulation</div>
            <div className="text-xs text-slate-400">Simulate queueing, compute, transfers, and get p50/p99.</div>
            <Button variant="primary" onClick={onRun}>Run now</Button>
          </Card>
          <Card className="p-3 space-y-2">
            <div className="text-slate-200 font-semibold">Explore timeline</div>
            <div className="text-xs text-slate-400">Playback, zoom, see active spans and counters.</div>
            <Button variant="secondary" onClick={onTimeline}>Open timeline</Button>
          </Card>
          <Card className="p-3 space-y-2">
            <div className="text-slate-200 font-semibold">Compare or sweep</div>
            <div className="text-xs text-slate-400">Compare runs or sweep RPS/concurrency to spot knees.</div>
            <Button variant="secondary" onClick={onCompare}>Go to compare/sweeps</Button>
          </Card>
        </div>
      </Card>

      <div className="grid md:grid-cols-[2fr,1fr] gap-4">
        <QuickQuestions
          onBottleneck={onRun}
          onSla={onRun}
          onConcurrency={onCompare}
          onGpuCount={onCompare}
          onCompare={onCompare}
        />
        <Card className="p-4 space-y-2">
          <div className="text-slate-100 font-semibold">Have a real trace?</div>
          <div className="text-xs text-slate-400">Upload an Nsight Systems sqlite to overlay a real run.</div>
          <Button variant="primary" onClick={onUploadTrace}>Upload Nsight trace</Button>
        </Card>
      </div>
    </div>
  )
}
