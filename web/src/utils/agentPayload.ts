type AgentPayloadOptions = {
  run?: any
  scenario?: any
  goal?: string
}

export function buildAgentPayload({ run, scenario, goal }: AgentPayloadOptions) {
  const payload: any = {
    source: 'simulation',
    goal: goal || 'balanced',
    benchmark: undefined,
    gpu: undefined,
    model_config: undefined,
    sla: undefined,
    cost: undefined,
  }

  const summary = run?.summary || {}
  const scenarioData = run?.scenario || scenario || {}
  const plannerReport = run?.plannerReport

  if (summary) {
    payload.benchmark = {
      throughput: firstNumber(summary?.throughput_rps, summary?.throughput),
      p50_latency_ms: firstNumber(summary?.p50_ms, summary?.p50LatencyMS, summary?.p50),
      p95_latency_ms: firstNumber(summary?.p90_ms, summary?.p95LatencyMS, summary?.p95),
      p99_latency_ms: firstNumber(summary?.p99_ms, summary?.p99),
      queue_time_ms: firstNumber(summary?.avg_queue_ms, summary?.AvgQueueMS),
      batch_size: firstNumber(scenarioData?.workload?.batch, scenarioData?.workload?.batch_size, run?.benchmark?.batch_size),
      concurrency: firstNumber(scenarioData?.target?.concurrency, run?.benchmark?.concurrency),
    }
  }

  if (scenarioData?.target || summary) {
    payload.gpu = {
      name: scenarioData?.target?.name || '',
      utilization_percent: firstNumber(summary?.gpu_util_percent, summary?.GPUUtilization),
      memory_used_mb: firstNumber(scenarioData?.target?.memory_used_mb, scenarioData?.target?.memory_mb),
      memory_total_mb: firstNumber(scenarioData?.target?.memory_total_mb),
      power_watts: firstNumber(scenarioData?.target?.power_watts),
    }
  }

  if (plannerReport) {
    payload.model_config = {
      model_name: plannerReport.model?.name || '',
      backend: 'simulated',
      dynamic_batching_enabled: !!plannerReport.inputs?.batchSize && plannerReport.inputs.batchSize > 1,
      preferred_batch_size: plannerReport.inputs?.batchSize ? [plannerReport.inputs.batchSize] : [],
      max_queue_delay_microseconds: 0,
      instance_count: 1,
      precision: plannerReport.inputs?.quantization || 'unknown',
    }
    payload.sla = {
      target_p99_latency_ms: firstNumber(plannerReport.inputs?.targetP99Ms, plannerReport.targetP99Ms),
      target_throughput: firstNumber(plannerReport.inputs?.averageRps, plannerReport.planningRps),
    }
    payload.cost = {
      gpu_hourly_price: firstNumber(plannerReport.inputs?.hourlyPrice, plannerReport.gpu?.hourly_price_estimate),
      deployment_hours_per_month: firstNumber(plannerReport.inputs?.deploymentHoursPerMonth),
    }
  }

  if (payload.benchmark) {
    const benchmark = payload.benchmark as Record<string, any>
    Object.keys(benchmark).forEach((key) => {
      if (benchmark[key] === undefined) {
        delete benchmark[key]
      }
    })
  }
  if (payload.gpu) {
    const gpu = payload.gpu as Record<string, any>
    Object.keys(gpu).forEach((key) => {
      if (gpu[key] === undefined) {
        delete gpu[key]
      }
    })
  }

  return payload
}

function firstNumber(...values) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num >= 0) return num
  }
  return undefined
}
