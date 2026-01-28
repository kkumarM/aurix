package sim

import (
	"testing"

	"simulator/pkg/schema"
)

// Ensure p50 != p99 when jitter and load are present.
func TestJitterProducesSpread(t *testing.T) {
	s := schema.Scenario{
		Name: "jitter",
		Workload: schema.Workload{
			Name:      "wl",
			RPS:       20,
			Duration:  2,
			Batch:     1,
			JitterPct: 10,
		},
		Pipeline: []schema.Stage{
			{Name: "compute", Kind: schema.StageTokens, Value: 200},
		},
		Target: schema.GPUProfile{
			Name:        "GPU",
			TFLOPS:      50,
			MemGBps:     900,
			TokenCost:   0.2,
			H2DBandwGB:  30,
			D2HBandwGB:  30,
			Concurrency: 2,
		},
	}
	results, _ := Run(s, 42)
	sum := Summarize(results, s.Workload.Duration, s.Target)
	if sum.P50LatencyMS == sum.P99LatencyMS {
		t.Fatalf("expected jittered latencies to differ: p50=%f p99=%f", sum.P50LatencyMS, sum.P99LatencyMS)
	}
}

// Ensure queue wait increases under higher load.
func TestQueueWaitIncreasesWithLoad(t *testing.T) {
	baseScenario := schema.Scenario{
		Name: "queue",
		Workload: schema.Workload{
			Name:      "wl",
			RPS:       2,
			Duration:  2,
			Batch:     1,
			JitterPct: 0,
		},
		Pipeline: []schema.Stage{
			{Name: "compute", Kind: schema.StageTokens, Value: 500},
		},
		Target: schema.GPUProfile{
			Name:        "GPU",
			TFLOPS:      10,
			MemGBps:     900,
			TokenCost:   1.0,
			H2DBandwGB:  30,
			D2HBandwGB:  30,
			Concurrency: 1,
		},
	}

	low, _ := Run(baseScenario, 1)
	lowSum := Summarize(low, baseScenario.Workload.Duration, baseScenario.Target)

	highScenario := baseScenario
	highScenario.Workload.RPS = 10
	high, _ := Run(highScenario, 1)
	highSum := Summarize(high, highScenario.Workload.Duration, highScenario.Target)

	if highSum.AvgQueueMS <= lowSum.AvgQueueMS {
		t.Fatalf("expected higher queue wait at higher RPS; low=%f high=%f", lowSum.AvgQueueMS, highSum.AvgQueueMS)
	}
}
