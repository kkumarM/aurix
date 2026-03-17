import React from 'react'
import Card from './ui/Card'
import Button from './ui/Button'

export default function QuickQuestions({ onBottleneck, onSla, onConcurrency, onGpuCount, onCompare }) {
  const items = [
    { label: 'What is my bottleneck?', action: onBottleneck },
    { label: 'Will this meet my SLA?', action: onSla },
    { label: 'How does concurrency affect latency?', action: onConcurrency },
    { label: 'How many GPUs might I need?', action: onGpuCount },
    { label: 'How does this compare to another run?', action: onCompare },
  ]
  return (
    <Card className="p-4 space-y-3">
      <div className="text-slate-100 font-semibold">What do you want to know?</div>
      <div className="grid sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <Button key={item.label} variant="secondary" onClick={item.action}>
            {item.label}
          </Button>
        ))}
      </div>
      <div className="text-xs text-slate-500">Each button jumps to the most relevant area.</div>
    </Card>
  )
}
