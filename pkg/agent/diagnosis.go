package agent

import (
	"fmt"
	"strings"
)

func DiagnoseRequest(req DiagnosisRequest) DiagnosisResponse {
	ctx := BuildPerformanceContext(req)
	return DiagnoseContext(ctx)
}

func DiagnoseContext(ctx PerformanceContext) DiagnosisResponse {
	missing := collectMissingData(ctx)
	evidence := []string{}
	nextExperiments := buildGoalExperiments(ctx.Goal)
	productionNotes := []string{}
	recommendations := []Recommendation{}
	secondary := []string{}
	primary := "Balanced"
	severity := "medium"
	confidence := diagnoseConfidence(len(missing), ctx)

	queue := ctx.Benchmark.QueueTimeMS
	p50 := ctx.Benchmark.P50LatencyMS
	p95 := ctx.Benchmark.P95LatencyMS
	p99 := ctx.Benchmark.P99LatencyMS
	compute := ctx.Benchmark.ComputeTimeMS
	gpuUtil := ctx.GPU.UtilizationPercent
	memoryPct := pctOf(ctx.GPU.MemoryUsedMB, ctx.GPU.MemoryTotalMB)
	dynamicBatching := ctx.ModelConfig.DynamicBatchingEnabled
	goal := ctx.Goal
	targetP99 := ctx.SLA.TargetP99LatencyMS

	candidates := []ruleCandidate{}

	if memoryPct > 90 {
		candidates = append(candidates, ruleCandidate{
			name:     "Memory pressure",
			evidence: fmt.Sprintf("GPU memory usage is %.1f%%, which is above the 90%% pressure threshold.", memoryPct),
			recommendations: []Recommendation{{
				Title:          "Reduce memory pressure",
				Description:    "Lower batch size, instance count, or sequence length to reduce peak GPU memory usage.",
				ExpectedImpact: "Reduces OOM risk and improves memory headroom.",
				Risk:           "May reduce throughput or increase latency.",
			}},
			nextExperiments: []string{"Run a batch size sweep to find the highest safe operating point."},
			productionNotes: []string{"OOM risk under peak load due to high GPU memory usage."},
			severity:        "high",
		})
	}

	if gpuUtil > 0 && gpuUtil < 50 && queue > 0 && (queue < max(10, p50*0.25) || p50 == 0) {
		message := fmt.Sprintf("GPU utilization is %.1f%% while queue time is low, indicating GPU underutilization.", gpuUtil)
		candidates = append(candidates, ruleCandidate{
			name:     "GPU underutilization",
			evidence: message,
			recommendations: []Recommendation{
				{Title: "Increase concurrency",
					Description:    "Increase the number of concurrent GPU tasks to better fill the GPU.",
					ExpectedImpact: "Should improve throughput and reduce idle GPU time.",
					Risk:           "May increase latency if the workload becomes queue-bound or memory-limited.",
				},
				{Title: "Test dynamic batching",
					Description:    "Enable and tune dynamic batching to let the GPU process larger effective batches.",
					ExpectedImpact: "Can improve utilization and throughput.",
					Risk:           "May add latency if batch waiting time grows too much.",
				},
				{Title: "Run a concurrency sweep",
					Description:    "Benchmark different concurrency settings to find the most efficient GPU utilization point.",
					ExpectedImpact: "Identifies the best concurrency setting for this workload.",
					Risk:           "Results may vary with other configuration changes.",
				},
			},
			nextExperiments: []string{"Run a concurrency sweep to find better GPU utilization."},
			severity:        "medium",
		})
		if goal == "cost" {
			candidates[len(candidates)-1].recommendations = append(candidates[len(candidates)-1].recommendations, Recommendation{
				Title:          "Improve utilization before adding GPUs",
				Description:    "Focus on using the current GPU more efficiently before scaling out hardware.",
				ExpectedImpact: "Reduces overall cost by avoiding overprovisioning.",
				Risk:           "May require tuning rather than immediate capacity changes.",
			})
		}
	}

	if queue > 0 && (p99 > 0 && queue >= 0.3*p99 || (p50 > 0 && queue >= 0.5*p50) || queue >= 20) {
		message := fmt.Sprintf("Average queue time is %.1f ms, which is a significant share of end-to-end latency.", queue)
		candidates = append(candidates, ruleCandidate{
			name:     "Queue-bound",
			evidence: message,
			recommendations: []Recommendation{
				{Title: "Reduce queue delay",
					Description:    "Cut maximum queue delay and tune request pacing to reduce end-to-end latency.",
					ExpectedImpact: "Lowers latency and queue buildup.",
					Risk:           "May reduce maximum throughput if concurrency remains unchanged.",
				},
				{Title: "Tune concurrency",
					Description:    "Adjust concurrency so the GPU can drain incoming requests more efficiently.",
					ExpectedImpact: "Improves balance between queueing and compute.",
					Risk:           "Too much concurrency can raise latency or memory pressure.",
				},
				{Title: "Lower preferred batch size if latency is the goal",
					Description:    "Smaller batches can reduce queue wait for latency-sensitive workloads.",
					ExpectedImpact: "Reduces queue latency for tail-sensitive SLAs.",
					Risk:           "May lower throughput.",
				},
			},
			nextExperiments: []string{"Run an RPS/concurrency sweep to measure queue buildup."},
			severity:        "medium",
		})
	}

	if compute > 0 && p99 > 0 && compute >= 0.5*p99 && gpuUtil >= 70 {
		message := fmt.Sprintf("Compute time dominates latency (%.1f ms) and GPU utilization is high (%.1f%%).", compute, gpuUtil)
		candidates = append(candidates, ruleCandidate{
			name:     "GPU compute-bound",
			evidence: message,
			recommendations: []Recommendation{
				{Title: "Optimize precision",
					Description:    "Use lower precision or quantization to reduce compute time.",
					ExpectedImpact: "Can lower latency and raise throughput.",
					Risk:           "May reduce model quality or increase tuning effort.",
				},
				{Title: "Tune TensorRT / TensorRT-LLM",
					Description:    "Benchmark engine settings and layer fusion for better execution efficiency.",
					ExpectedImpact: "Improves GPU execution efficiency.",
					Risk:           "Requires additional tooling and validation.",
				},
				{Title: "Review model size and quantization",
					Description:    "Consider smaller or quantized models to lower compute demand.",
					ExpectedImpact: "May reduce latency and cost.",
					Risk:           "Could impact model accuracy.",
				},
			},
			nextExperiments: []string{"Compare GPU profile or engine tuning results against the current run."},
			severity:        "medium",
		})
	}

	if p95 > 0 && p50 > 0 && p95 >= p50*1.4 {
		message := fmt.Sprintf("Tail latency is unstable: p95 is %.1f ms compared to p50 at %.1f ms.", p95, p50)
		candidates = append(candidates, ruleCandidate{
			name:     "Tail latency instability",
			evidence: message,
			recommendations: []Recommendation{
				{Title: "Stress test the workload",
					Description:    "Run higher-load tests to validate tail latency under realistic peak conditions.",
					ExpectedImpact: "Exposes tail latency issues before production.",
					Risk:           "May surface issues that require deeper investigation.",
				},
				{Title: "Monitor p99 continuously",
					Description:    "Track tail latency metrics over time to catch regressions.",
					ExpectedImpact: "Improves SLA control.",
					Risk:           "Requires monitoring infrastructure.",
				},
				{Title: "Inspect queue wait",
					Description:    "Check whether queueing is contributing to the increased tail latency.",
					ExpectedImpact: "Helps isolate the root cause.",
					Risk:           "May require deeper trace analysis.",
				},
			},
			nextExperiments: []string{"Measure tail latency under higher load and different concurrency settings."},
			severity:        "medium",
		})
	}

	if !dynamicBatching && (goal == "throughput" || goal == "cost") {
		message := "Dynamic batching is disabled while the goal prioritizes throughput or cost."
		candidates = append(candidates, ruleCandidate{
			name:     "Dynamic batching disabled",
			evidence: message,
			recommendations: []Recommendation{{
				Title:          "Enable dynamic batching",
				Description:    "Turn on dynamic batching and test preferred batch sizes such as [4, 8] if memory allows.",
				ExpectedImpact: "Can improve throughput and GPU efficiency.",
				Risk:           "May add latency if batch waits grow too large.",
			}},
			severity: "low",
		})
	}

	if goal == "latency" {
		for _, rec := range buildGoalRecommendations(goal, ctx) {
			recommendations = append(recommendations, rec)
		}
	}
	if goal == "throughput" {
		for _, rec := range buildGoalRecommendations(goal, ctx) {
			recommendations = append(recommendations, rec)
		}
	}
	if goal == "cost" {
		for _, rec := range buildGoalRecommendations(goal, ctx) {
			recommendations = append(recommendations, rec)
		}
	}

	primaryCandidate := selectPrimaryCandidate(candidates)
	if primaryCandidate.name != "Balanced" {
		primary = primaryCandidate.name
		severity = primaryCandidate.severity
		evidence = append(evidence, primaryCandidate.evidence)
		recommendations = append(recommendations, primaryCandidate.recommendations...)
		nextExperiments = append(nextExperiments, primaryCandidate.nextExperiments...)
		productionNotes = append(productionNotes, primaryCandidate.productionNotes...)
		for _, candidate := range candidates {
			if candidate.name != primaryCandidate.name {
				secondary = append(secondary, candidate.name)
			}
		}
	}

	if targetP99 > 0 && p99 > 0 && p99 > targetP99*1.2 {
		message := fmt.Sprintf("Observed p99 (%.1f ms) is more than 20%% above the SLA target of %.1f ms.", p99, targetP99)
		evidence = append(evidence, message)
		recommendations = filterRecommendationsAvoidingConcurrency(recommendations)
	}

	if len(evidence) == 0 {
		evidence = append(evidence, "No single dominant bottleneck was detected with the available metrics.")
	}

	if len(recommendations) == 0 {
		recommendations = []Recommendation{{
			Title:          "Review workload and data quality",
			Description:    "Gather more benchmark or trace data so the advisor can make a stronger recommendation.",
			ExpectedImpact: "Improves diagnosis confidence.",
			Risk:           "Minimal; this is an information-gathering step.",
		}}
	}

	recommendations = dedupeRecommendations(recommendations)
	nextExperiments = dedupeStrings(append(nextExperiments, buildGoalExperiments(goal)...))

	summary := fmt.Sprintf("The advisor analyzed %s data with a %s goal and identified %s.", ctx.Source, goal, strings.ToLower(primary))
	if len(missing) > 0 {
		summary += " Some inputs are missing, so this guidance is partial."
	}

	return DiagnosisResponse{
		AdvisorVersion:       "v1",
		Source:               ctx.Source,
		Goal:                 goal,
		PrimaryBottleneck:    primary,
		SecondaryBottlenecks: secondary,
		Severity:             severity,
		Confidence:           confidence,
		Summary:              summary,
		Evidence:             evidence,
		Recommendations:      recommendations,
		NextExperiments:      nextExperiments,
		ProductionNotes:      productionNotes,
		MissingData:          missing,
		FutureLLMContext: FutureLLMContext{
			SystemFacts:       buildSystemFacts(ctx),
			SafePromptContext: makeSafePromptContext(ctx),
		},
	}
}

func collectMissingData(ctx PerformanceContext) []string {
	missing := []string{}
	if ctx.Benchmark.Throughput == 0 && ctx.Benchmark.P99LatencyMS == 0 {
		missing = append(missing, "throughput or p99 latency")
	}
	if ctx.Benchmark.QueueTimeMS == 0 {
		missing = append(missing, "queue time")
	}
	if ctx.GPU.UtilizationPercent == 0 {
		missing = append(missing, "GPU utilization")
	}
	if ctx.GPU.MemoryUsedMB == 0 || ctx.GPU.MemoryTotalMB == 0 {
		missing = append(missing, "GPU memory usage")
	}
	if ctx.ModelConfig.ModelName == "" {
		missing = append(missing, "model config")
	}
	return missing
}

func diagnoseConfidence(missingCount int, ctx PerformanceContext) string {
	if missingCount > 2 {
		return "low"
	}
	if missingCount > 0 {
		return "medium"
	}
	if ctx.Benchmark.Throughput > 0 && ctx.Benchmark.P99LatencyMS > 0 {
		return "high"
	}
	return "medium"
}

func pctOf(value, total float64) float64 {
	if total <= 0 {
		return 0
	}
	return value / total * 100.0
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func buildSystemFacts(ctx PerformanceContext) []string {
	facts := []string{fmt.Sprintf("source: %s", ctx.Source), fmt.Sprintf("goal: %s", ctx.Goal)}
	if ctx.Benchmark.Throughput > 0 {
		facts = append(facts, fmt.Sprintf("throughput: %.1f rps", ctx.Benchmark.Throughput))
	}
	if ctx.Benchmark.P99LatencyMS > 0 {
		facts = append(facts, fmt.Sprintf("p99 latency: %.1f ms", ctx.Benchmark.P99LatencyMS))
	}
	if ctx.GPU.Name != "" {
		facts = append(facts, fmt.Sprintf("gpu: %s", ctx.GPU.Name))
	}
	if ctx.GPU.UtilizationPercent > 0 {
		facts = append(facts, fmt.Sprintf("gpu utilization: %.1f%%", ctx.GPU.UtilizationPercent))
	}
	if ctx.ModelConfig.ModelName != "" {
		facts = append(facts, fmt.Sprintf("model: %s", ctx.ModelConfig.ModelName))
	}
	return facts
}

func filterRecommendationsAvoidingConcurrency(recs []Recommendation) []Recommendation {
	filtered := []Recommendation{}
	for _, rec := range recs {
		if strings.Contains(strings.ToLower(rec.Title), "concurrency") || strings.Contains(strings.ToLower(rec.Description), "concurrency") {
			continue
		}
		filtered = append(filtered, rec)
	}
	if len(filtered) == 0 {
		return recs
	}
	return filtered
}

func dedupeRecommendations(recs []Recommendation) []Recommendation {
	seen := map[string]struct{}{}
	out := []Recommendation{}
	for _, rec := range recs {
		key := strings.ToLower(rec.Title + "|" + rec.Description)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, rec)
	}
	return out
}

func dedupeStrings(items []string) []string {
	seen := map[string]struct{}{}
	out := []string{}
	for _, item := range items {
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}
