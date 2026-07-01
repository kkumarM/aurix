import { ExperimentPlan } from './experimentPlan'

export type ProductionReadinessContext = {
  advisor?: any
  run?: any
  scenario?: any
  goal?: string
}

export type ProductionReadinessResult = {
  score: number
  level: 'low' | 'medium' | 'high'
  summary: string
  passed_checks: string[]
  failed_checks: string[]
  warnings: string[]
}

export function calculateProductionReadiness(context: ProductionReadinessContext): ProductionReadinessResult {
  const { advisor, run, scenario, goal } = context
  const summary = run?.summary || {}
  const targetP99 = firstNumber(
    scenario?.analysis?.target_p99_ms,
    scenario?.goal?.target_p99_ms,
    scenario?.target_p99_ms,
    scenario?.workload?.target_p99_ms,
  )
  const p50 = firstNumber(summary?.p50_ms, summary?.p50)
  const p95 = firstNumber(summary?.p95_ms, summary?.p95, summary?.p90_ms)
  const p99 = firstNumber(summary?.p99_ms, summary?.p99)
  const avgQueue = firstNumber(summary?.avg_queue_ms, summary?.avgQueueMS, summary?.avg_queue)
  const duration = firstNumber(summary?.duration_s, summary?.duration || 0)
  const sampleCount = firstNumber(summary?.sample_count, summary?.samples, summary?.request_count)
  const gpuUtil = firstNumber(summary?.gpu_util_percent, summary?.gpu_utilization, summary?.gpu_util)
  const memoryUsed = firstNumber(summary?.memory_used_mb, summary?.memory_used, summary?.gpu_memory_used)
  const memoryTotal = firstNumber(summary?.memory_total_mb, summary?.memory_total, summary?.gpu_memory_total)
  const costEstimate = Boolean(scenario?.analysis?.monthly_cost || scenario?.analysis?.cost || scenario?.goal?.cost)
  const hasCalibration = Boolean(scenario?.meta?.calibration || scenario?.analysis?.calibrated || run?.breakdown)
  const productionNotes: string[] = Array.isArray(advisor?.production_notes) ? advisor.production_notes : []

  const passed: string[] = []
  const failed: string[] = []
  const warnings: string[] = []
  let score = 100

  if (p99) {
    passed.push('p99 latency available')
  } else {
    failed.push('p99 latency not available')
    score -= 40
  }

  if (targetP99) {
    passed.push('SLA target available')
  } else {
    warnings.push('Target SLA is missing')
    score -= 10
  }

  if (memoryUsed && memoryTotal) {
    passed.push('Memory usage information available')
    const headroomPct = (memoryTotal - memoryUsed) / memoryTotal * 100
    if (headroomPct >= 10) {
      passed.push('Memory headroom is healthy')
    } else {
      failed.push('Memory headroom below 10%')
      score -= 15
    }
  } else {
    warnings.push('GPU memory usage data is incomplete')
    score -= 10
  }

  if (duration >= 30 || sampleCount >= 100) {
    passed.push('Run duration/sample count is sufficient')
  } else {
    warnings.push('Run duration or sample count is low')
    score -= 10
  }

  if (avgQueue && p99) {
    const queueShare = avgQueue / p99
    if (queueShare < 0.25) {
      passed.push('Queue time is not dominating latency')
    } else if (queueShare < 0.5) {
      warnings.push('Queue time is significant compared to p99')
      score -= 10
    } else {
      failed.push('Queue time dominates end-to-end latency')
      score -= 15
    }
  } else {
    warnings.push('Queue time data is incomplete')
    score -= 5
  }

  if (goal === 'cost') {
    if (gpuUtil) {
      if (gpuUtil < 30) {
        failed.push('GPU utilization is too low for a cost-focused workload')
        score -= 15
      } else {
        passed.push('GPU utilization is acceptable for cost goals')
      }
    } else {
      warnings.push('GPU utilization data is missing for cost assessment')
      score -= 10
    }

    if (costEstimate) {
      passed.push('Cost estimate is available for planning')
    } else {
      warnings.push('Cost estimate is not available')
      score -= 10
    }
  }

  if (p50 && p95) {
    const ratio = p95 / p50
    if (ratio <= 1.4) {
      passed.push('Tail latency is reasonably stable')
    } else {
      warnings.push('p95 is significantly higher than p50')
      score -= 10
    }
  }

  if (p50 && p99) {
    const ratio = p99 / p50
    if (ratio <= 2) {
      passed.push('p99 is within acceptable range of p50')
    } else {
      warnings.push('p99 is more than twice p50')
      score -= 10
    }
  }

  if (hasCalibration) {
    passed.push('Trace or benchmark calibration is available')
  } else {
    warnings.push('Real benchmark or trace calibration is not available')
    score -= 10
  }

  if (productionNotes.length > 0) {
    warnings.push(...productionNotes)
    score -= Math.min(20, productionNotes.length * 5)
  }

  score = Math.max(0, Math.min(100, score))

  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
  const summaryText = level === 'high'
    ? 'Ready for benchmark comparison'
    : level === 'medium'
      ? 'Use for early planning only'
      : 'Needs real trace validation before production'

  return {
    score,
    level,
    summary: summaryText,
    passed_checks: passed,
    failed_checks: failed,
    warnings,
  }
}

function firstNumber(...values: any[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}
