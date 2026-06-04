package agent

func buildNextExperiments(ctx PerformanceContext) []string {
	experiments := []string{}
	if ctx.Goal == "throughput" {
		experiments = append(experiments, "Run a concurrency and batch size sweep.")
	}
	if ctx.Goal == "latency" {
		experiments = append(experiments, "Run a latency-focused batch size sweep.")
	}
	if ctx.Goal == "cost" {
		experiments = append(experiments, "Compare GPU profiles for cost and utilization.")
	}
	if len(experiments) == 0 {
		experiments = append(experiments, "Run a sweep to compare concurrency, batch size, and GPU options.")
	}
	return experiments
}

func makeSafePromptContext(ctx PerformanceContext) string {
	return "Future LLM assistants should use the advisor facts as the single source of truth when answering questions about GPU performance, bottlenecks, recommendations, and experiments. Avoid speculative claims without evidence."
}
