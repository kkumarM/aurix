import React from 'react'
import Card from './ui/Card'

export default function AboutGparx() {
  return (
    <div className="max-w-5xl mx-auto space-y-5 text-slate-200">
      <header className="flex items-center gap-4">
        <GparxLogo />
        <div className="space-y-1">
          <div className="text-2xl font-semibold">GPARX — GPU Performance Analysis &amp; Reasoning eXplorer</div>
          <div className="text-sm text-slate-400">Outcome-first reasoning for GPU workload planning, capacity, and performance behavior.</div>
        </div>
      </header>

      <Card className="p-5 space-y-4">
        <Section
          title="What problem does GPARX solve?"
          body="GPARX helps engineers and teams reason about GPU workload behavior before deployment by estimating performance, queueing, saturation, and cost drivers."
        />

        <Section
          title="Who is it for?"
          bullets={[
            'LLM developers',
            'platform teams',
            'performance engineers',
            'corporate infrastructure teams',
            'individuals evaluating GPUs',
          ]}
        />

        <Section
          title="What can I answer with GPARX?"
          bullets={[
            'Which GPU profile should I try?',
            'Will my workload meet p99 latency?',
            'What happens if I increase concurrency?',
            'Where is my bottleneck?',
            'What workload shape causes queueing?',
            'How should I plan GPU capacity?',
          ]}
        />

        <Section
          title="What GPARX is not"
          bullets={[
            'not a CUDA simulator',
            'not a chemistry/model simulator',
            'not a benchmark replacement',
            'not a profiler replacement',
          ]}
          tone="negative"
        />
      </Card>

      <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-4">
        <Card className="p-5 space-y-4">
          <div className="text-lg font-semibold text-slate-100">Suggested workflow</div>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
            <li>Choose your goal.</li>
            <li>Use Wizard or Expert Scenario Builder.</li>
            <li>Run simulation.</li>
            <li>Read Decision Summary.</li>
            <li>Inspect Timeline if needed.</li>
            <li>Use Sweeps/Compare for what-if analysis.</li>
            <li>Calibrate with real trace when available.</li>
          </ol>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="text-lg font-semibold text-slate-100">Where GPARX is headed</div>
          <div className="text-sm text-slate-300">
            Phase 1 makes the current simulator easier to understand and use. Phase 2 expands that into LLM cost and capacity planning with clearer SLA and GPU-count workflows.
          </div>
          <div className="text-sm text-slate-400">
            Today you can already use examples, Wizard, Timeline, Compare, Sweeps, and real trace ingestion to reason about deployment decisions.
          </div>
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div className="text-lg font-semibold text-slate-100">gPARX Advisor</div>
        <div className="text-sm text-slate-300">
          The Advisor layer uses deterministic, explainable rules to diagnose performance, detect bottlenecks, and recommend next actions.
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-start gap-2"><span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400" />Analyzes simulation or benchmark metrics to find queue, compute, memory, and latency issues.</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400" />Provides partial guidance when data is missing and warns about missing metrics.</li>
          <li className="flex items-start gap-2"><span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400" />Supports a future optional LLM assistant layer that will answer questions over structured advisor facts.</li>
        </ul>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="text-lg font-semibold text-slate-100">LLM Cost Planner</div>
        <div className="text-sm text-slate-300">
          The LLM Cost Planner turns LLM-native inputs such as model choice, quantization, tokens, RPS, SLA, and GPU pricing into a generated GPARX scenario, runs the simulator, and returns a decision-oriented capacity and cost estimate.
        </div>
        <Section
          title="What it does"
          bullets={[
            'maps LLM inputs into a generated simulation scenario',
            'checks approximate memory feasibility on the chosen GPU',
            'estimates p50, p99, bottleneck, GPU count, monthly cost, and cost per 1M tokens',
            'lets you open the generated scenario, inspect timeline, run sweeps, and compare GPUs',
          ]}
        />
        <Section
          title="What the inputs mean"
          bullets={[
            'model and quantization define the weight and compute footprint',
            'input/output tokens define request shape and total tokens per request',
            'average and peak RPS control cost and capacity sizing',
            'GPU profile and hourly price control performance assumptions and cost',
            'serving mode and concurrency shape batching and KV-cache pressure',
          ]}
        />
        <Section
          title="What the outputs mean"
          bullets={[
            'feasibility summarizes whether the plan should meet the SLA',
            'required GPU count sizes capacity with safety headroom',
            'monthly cost and cost per 1M tokens express operating cost',
            'memory feasibility warns when the plan is too tight or too large for the selected GPU',
            'bottleneck explains what to inspect next in timeline or sweeps',
          ]}
        />
        <Section
          title="When to trust it"
          bullets={[
            'for early planning, architecture tradeoffs, and rough cost comparisons',
            'for deciding which GPU family or capacity range to benchmark first',
          ]}
        />
        <Section
          title="When to calibrate"
          bullets={[
            'when you already have a serving stack and real measurements',
            'when small latency differences change product or SLA decisions',
            'when memory, batching, or scheduler behavior is framework-specific',
          ]}
        />
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          This is a planning estimator. Production decisions should be validated with benchmarks or Nsight traces.
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="text-lg font-semibold text-slate-100">Project visibility checklist</div>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-center gap-2"><Dot /><span>Add GitHub description</span></li>
          <li className="flex items-center gap-2"><Dot /><span>Add topics: gpu, llm, inference, capacity-planning, performance-analysis, nsight, nvidia, cost-estimation</span></li>
          <li className="flex items-center gap-2"><Dot /><span>Add screenshots / GIF</span></li>
          <li className="flex items-center gap-2"><Dot /><span>Add release v0.1.0</span></li>
          <li className="flex items-center gap-2"><Dot /><span>Add demo workflow</span></li>
        </ul>
      </Card>
    </div>
  )
}

function Section({
  title,
  body,
  bullets,
  tone = 'neutral',
}: {
  title: string
  body?: string
  bullets?: string[]
  tone?: 'neutral' | 'negative'
}) {
  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold text-slate-100">{title}</div>
      {body && <div className="text-sm text-slate-300 leading-relaxed">{body}</div>}
      {bullets && (
        <ul className="space-y-2 text-sm">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 rounded-full ${tone === 'negative' ? 'bg-red-400' : 'bg-emerald-400'}`} />
              <span className="text-slate-300">{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Dot() {
  return <span className="h-2 w-2 rounded-full bg-emerald-400" />
}

function GparxLogo() {
  return (
    <svg width="72" height="72" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow" aria-label="GPARX logo">
      <path d="M60 4 L8 116 H112 Z" fill="none" stroke="#34D399" strokeWidth="8" strokeLinejoin="round" />
      <path d="M25 82 H95" stroke="#34D399" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 66 H88" stroke="#34D399" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 50 H82" stroke="#34D399" strokeWidth="4" strokeLinecap="round" />
      <path d="M48 34 H76" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}
