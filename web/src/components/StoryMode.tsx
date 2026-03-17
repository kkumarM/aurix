import React, { useEffect, useState } from 'react'
import Card from './ui/Card'
import Button from './ui/Button'

const steps = [
  { id: 'queue', title: 'Queueing', body: 'Requests wait when concurrency/GPU slots are full. Watch the QUEUE lane and counters.' },
  { id: 'gpu', title: 'GPU Compute', body: 'GPU lane shows compute spans. High occupancy means compute-bound.' },
  { id: 'transfer', title: 'Transfers', body: 'H2D/D2H lanes show data movement. Large payloads or low bandwidth increase these spans.' },
  { id: 'p99', title: 'Why p99 grows', body: 'Tail latency rises when queue builds or compute saturates. Look at active spans and counters.' },
]

export default function StoryMode({ onSelectLane, onClose }: { onSelectLane: (lane: string | null) => void; onClose: () => void }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const lane = steps[step].id === 'transfer' ? 'h2d' : steps[step].id === 'p99' ? null : steps[step].id
    onSelectLane(lane)
    return () => onSelectLane(null)
  }, [step, onSelectLane])

  const exit = () => {
    onSelectLane(null)
    if (typeof localStorage !== 'undefined') localStorage.setItem('storymode', 'dismissed')
    onClose()
  }

  return (
    <Card className="p-4 space-y-3 max-w-md">
      <div className="flex items-center justify-between">
        <div className="text-slate-100 font-semibold">Story Mode</div>
        <button className="text-slate-400" onClick={exit}>✕</button>
      </div>
      <div className="text-sm text-emerald-200">Step {step + 1} / {steps.length}: {steps[step].title}</div>
      <div className="text-sm text-slate-200">{steps[step].body}</div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
        {step < steps.length - 1 ? (
          <Button variant="primary" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>Next</Button>
        ) : (
          <Button variant="primary" onClick={exit}>Finish</Button>
        )}
      </div>
    </Card>
  )
}
