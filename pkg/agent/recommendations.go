package agent

func buildGoalRecommendations(goal string, ctx PerformanceContext) []Recommendation {
	switch goal {
	case "latency":
		return []Recommendation{
			{
				Title:          "Favor lower latency over high batch sizes",
				Description:    "Use smaller batch sizes, low queue delay, and conservative concurrency settings to protect p95/p99 latency.",
				ExpectedImpact: "Improves latency stability and reduces tail spikes.",
				Risk:           "May reduce overall throughput.",
			},
			{
				Title:          "Monitor tail latency continuously",
				Description:    "Track p95 and p99 latency, especially when the queue grows, to detect instability early.",
				ExpectedImpact: "Catches latency regressions before they hurt SLA.",
				Risk:           "Requires more observability effort.",
			},
		}
	case "throughput":
		return []Recommendation{
			{
				Title:          "Sweep concurrency and batch size",
				Description:    "Run experiments across different concurrency and batch size settings to find the highest sustained throughput.",
				ExpectedImpact: "Helps identify the most efficient operating point.",
				Risk:           "May increase latency if not carefully constrained.",
			},
			{
				Title:          "Enable dynamic batching if available",
				Description:    "Dynamic batching can raise throughput by filling GPU compute with more work per cycle.",
				ExpectedImpact: "Improves GPU utilization and throughput. ",
				Risk:           "May increase latency if batches are too large.",
			},
			{
				Title:          "Watch p99 while scaling up",
				Description:    "Keep an eye on tail latency while increasing throughput to avoid SLA violations.",
				ExpectedImpact: "Balances throughput gains with latency risk.",
				Risk:           "May require tradeoffs between throughput and latency.",
			},
		}
	case "cost":
		return []Recommendation{
			{
				Title:          "Improve GPU utilization before adding capacity",
				Description:    "Maximize the work per GPU before scaling out to avoid paying for idle hardware.",
				ExpectedImpact: "Lowers cost per request.",
				Risk:           "May require additional tuning and monitoring.",
			},
			{
				Title:          "Compare cheaper GPU profiles",
				Description:    "Evaluate whether a less expensive GPU can meet your throughput and latency goals with tuning.",
				ExpectedImpact: "May reduce monthly GPU spend.",
				Risk:           "May require more benchmarking and validation.",
			},
			{
				Title:          "Estimate cost per 1M tokens",
				Description:    "Use request size and throughput to translate model workload into a familiar cost unit.",
				ExpectedImpact: "Makes infrastructure cost easier to compare.",
				Risk:           "Estimates may vary with actual deployment behavior.",
			},
		}
	default:
		return []Recommendation{}
	}
}

func buildGoalExperiments(goal string) []string {
	switch goal {
	case "latency":
		return []string{
			"Run a latency-focused batch size sweep.",
			"Measure p95 and p99 while lowering queue delay.",
		}
	case "throughput":
		return []string{
			"Run a concurrency and batch size sweep.",
			"Benchmark dynamic batching with larger preferred batch sizes.",
		}
	case "cost":
		return []string{
			"Compare GPU profiles for cost-to-throughput tradeoffs.",
			"Estimate cost per 1M tokens on the current configuration.",
		}
	default:
		return []string{
			"Run a concurrency or RPS sweep to uncover headroom.",
		}
	}
}
