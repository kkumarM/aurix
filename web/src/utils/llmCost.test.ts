import { describe, expect, it } from 'vitest'
import { estimateMemory, classifyFeasibility, buildPlannerReport, buildPlannerScenario, estimateMsPerToken, resolveGpu, resolveModel, type PlannerInput } from './llmCost'

const baseInput: PlannerInput = {
  model: { presetId: 'llama-3-1-8b' },
  quantization: 'bf16',
  averageRps: 2,
  peakRps: 4,
  planningMode: 'peak',
  averageInputTokens: 1200,
  averageOutputTokens: 300,
  targetP99Ms: 250,
  deploymentHoursPerMonth: 730,
  safetyHeadroomPct: 30,
  servingMode: 'continuous',
  batchSize: 4,
  maxConcurrentSequences: 4,
  kvCacheEnabled: true,
  gpu: { presetId: 'a10g', hourlyPrice: 1.2 },
  advancedEnabled: false,
}

describe('llmCost utilities', () => {
  it('marks oversized memory plans as infeasible', () => {
    const model = resolveModel({ presetId: 'llama-3-1-70b' })
    const gpu = resolveGpu({ presetId: 'l4' })
    const estimate = estimateMemory(model, gpu, 'bf16', 4, 8192, true)
    expect(estimate.status).toBe('Memory infeasible on selected GPU')
    expect(estimate.totalMemoryGb).toBeGreaterThan(gpu.memory_gb)
  })

  it('classifies memory-risk or near-SLA plans as risky', () => {
    expect(classifyFeasibility(230, 200, 'Memory feasible')).toBe('Risky')
    expect(classifyFeasibility(180, 200, 'Memory risky')).toBe('Risky')
  })

  it('computes capacity and cost outputs from planner inputs', () => {
    const model = resolveModel(baseInput.model)
    const gpu = resolveGpu(baseInput.gpu)
    const memory = estimateMemory(model, gpu, baseInput.quantization, baseInput.maxConcurrentSequences, baseInput.averageInputTokens + baseInput.averageOutputTokens, baseInput.kvCacheEnabled)
    const tokenEstimate = estimateMsPerToken(model, gpu, baseInput.quantization, baseInput.servingMode, baseInput.maxConcurrentSequences, { memory })
    const scenario = buildPlannerScenario(baseInput, model, gpu, tokenEstimate)
    const report = buildPlannerReport(
      baseInput,
      model,
      gpu,
      memory,
      tokenEstimate,
      { throughput_rps: 8, p50_ms: 120, p99_ms: 210, gpu_util_percent: 72, avg_queue_ms: 15 },
      null,
      scenario,
    )

    expect(report.requiredGpus).toBe(1)
    expect(report.monthlyCost).toBeGreaterThan(0)
    expect(report.costPer1MTokens).toBeGreaterThan(0)
    expect(report.generatedScenario.name).toContain('LLM Cost Plan')
  })
})
