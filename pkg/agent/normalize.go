package agent

import (
	"math"
	"simulator/pkg/schema"
	"strings"
)

func BuildPerformanceContext(req DiagnosisRequest) PerformanceContext {
	ctx := PerformanceContext{
		Source: normalizeSource(req.Source),
		Goal:   normalizeGoal(req.Goal),
	}
	if req.Benchmark != nil {
		ctx.Benchmark = *req.Benchmark
	}
	if req.GPU != nil {
		ctx.GPU = *req.GPU
	}
	if req.ModelConfig != nil {
		ctx.ModelConfig = *req.ModelConfig
	}
	if req.SLA != nil {
		ctx.SLA = *req.SLA
	}
	if req.Cost != nil {
		ctx.Cost = *req.Cost
	}
	return ctx
}

func BuildPerformanceContextFromRun(run schema.RunResult, breakdown *schema.Breakdown, scenario *schema.Scenario, goal string) PerformanceContext {
	ctx := PerformanceContext{
		Source: "simulation",
		Goal:   normalizeGoal(goal),
	}

	if run.Summary.Throughput > 0 {
		ctx.Benchmark.Throughput = run.Summary.Throughput
	}
	if run.Summary.P50LatencyMS > 0 {
		ctx.Benchmark.P50LatencyMS = run.Summary.P50LatencyMS
	}
	if run.Summary.P90LatencyMS > 0 {
		ctx.Benchmark.P95LatencyMS = run.Summary.P90LatencyMS
	}
	if run.Summary.P99LatencyMS > 0 {
		ctx.Benchmark.P99LatencyMS = run.Summary.P99LatencyMS
	}
	if run.Summary.AvgQueueMS > 0 {
		ctx.Benchmark.QueueTimeMS = run.Summary.AvgQueueMS
	}
	if run.Summary.GPUUtilization > 0 {
		ctx.GPU.UtilizationPercent = run.Summary.GPUUtilization
	}

	if scenario != nil {
		ctx.GPU.Name = scenario.Target.Name
		ctx.Benchmark.BatchSize = float64(scenario.Workload.Batch)
		ctx.Benchmark.Concurrency = float64(scenario.Target.Concurrency)
	}

	if breakdown != nil {
		ctx.Benchmark.ComputeTimeMS = averageCategoryMS(breakdown.StageAggregates, "compute")
		ctx.Benchmark.TransferTimeMS = averageCategoryMS(breakdown.StageAggregates, "h2d") + averageCategoryMS(breakdown.StageAggregates, "d2h")
		ctx.Benchmark.CPUTimeMS = averageCategoryMS(breakdown.StageAggregates, "cpu")
		if ctx.Benchmark.ComputeTimeMS == 0 {
			ctx.Benchmark.ComputeTimeMS = estimateEffectiveComputeMS(run.Summary)
		}
	} else {
		ctx.Benchmark.ComputeTimeMS = estimateEffectiveComputeMS(run.Summary)
	}

	if ctx.Benchmark.P95LatencyMS == 0 && ctx.Benchmark.P99LatencyMS > 0 {
		ctx.Benchmark.P95LatencyMS = ctx.Benchmark.P99LatencyMS
	}

	return ctx
}

func averageCategoryMS(aggs []schema.StageAggregate, category string) float64 {
	var total, count float64
	for _, a := range aggs {
		if a.Category == category {
			total += a.AvgMS
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return total
}

func estimateEffectiveComputeMS(summary schema.Summary) float64 {
	if summary.P50LatencyMS > 0 && summary.AvgQueueMS > 0 {
		return math.Max(0, summary.P50LatencyMS-summary.AvgQueueMS)
	}
	if summary.P99LatencyMS > 0 && summary.AvgQueueMS > 0 {
		return math.Max(0, summary.P99LatencyMS-summary.AvgQueueMS)
	}
	return 0
}

func normalizeSource(source string) string {
	s := strings.TrimSpace(strings.ToLower(source))
	switch s {
	case "simulation", "triton_benchmark", "tensorrt_llm", "nsight_trace", "manual":
		return s
	default:
		return "simulation"
	}
}

func normalizeGoal(goal string) string {
	s := strings.TrimSpace(strings.ToLower(goal))
	switch s {
	case "latency", "throughput", "balanced", "cost":
		return s
	default:
		return "balanced"
	}
}
