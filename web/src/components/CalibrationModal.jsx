import React, { useState } from 'react'
import Card from './ui/Card'
import { inputBase } from '../styles/formClasses'

export default function CalibrationModal({ open, onClose, scenario, setScenario }) {
  const [promptTokens, setPromptTokens] = useState(256)
  const [outputTokens, setOutputTokens] = useState(128)
  const [latencyMs, setLatencyMs] = useState(120)
  const [promptBytesPerToken, setPromptBytesPerToken] = useState(2)
  const [outputBytesPerToken, setOutputBytesPerToken] = useState(2)

  if (!open) return null

  const apply = () => {
    const msPerToken = Math.max(0.01, latencyMs / Math.max(1, outputTokens))
    const h2dBytes = promptTokens * promptBytesPerToken
    const d2hBytes = outputTokens * outputBytesPerToken
    setScenario((prev) => {
      const next = structuredClone(prev)
      next.workload = { ...next.workload, batch_size: 1 }
      next.target = { ...next.target, ms_per_token: msPerToken }
      next.pipeline = [
        { name: 'preprocess', kind: 'fixed_ms', value: 2 },
        { name: 'h2d', kind: 'bytes', value: h2dBytes },
        { name: 'compute', kind: 'tokens', value: outputTokens },
        { name: 'd2h', kind: 'bytes', value: d2hBytes },
        { name: 'postprocess', kind: 'fixed_ms', value: 1 },
      ]
      return next
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-100">Calibrate from LLM measurement</div>
          <button className="text-slate-400" onClick={onClose}>✕</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <label className="space-y-1 text-slate-200">
            <span>Prompt tokens</span>
            <input className={inputBase} type="number" value={promptTokens} onChange={(e) => setPromptTokens(parseInt(e.target.value, 10) || 0)} />
          </label>
          <label className="space-y-1 text-slate-200">
            <span>Output tokens</span>
            <input className={inputBase} type="number" value={outputTokens} onChange={(e) => setOutputTokens(parseInt(e.target.value, 10) || 0)} />
          </label>
          <label className="space-y-1 text-slate-200">
            <span>Measured end-to-end latency (ms)</span>
            <input className={inputBase} type="number" value={latencyMs} onChange={(e) => setLatencyMs(parseFloat(e.target.value) || 0)} />
          </label>
          <label className="space-y-1 text-slate-200">
            <span>Prompt bytes per token (default 2)</span>
            <input className={inputBase} type="number" value={promptBytesPerToken} onChange={(e) => setPromptBytesPerToken(parseFloat(e.target.value) || 0)} />
          </label>
          <label className="space-y-1 text-slate-200">
            <span>Output bytes per token (default 2)</span>
            <input className={inputBase} type="number" value={outputBytesPerToken} onChange={(e) => setOutputBytesPerToken(parseFloat(e.target.value) || 0)} />
          </label>
        </div>
        <div className="text-xs text-slate-400">
          We derive ms_per_token = latency / output_tokens and size H2D/D2H from token counts. Adjust bytes/token if you serialize differently.
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded border border-slate-700 text-slate-200" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded bg-emerald-500 text-slate-950 font-semibold" onClick={apply}>Apply</button>
        </div>
      </Card>
    </div>
  )
}
