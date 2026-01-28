package sim

import (
	"testing"

	"simulator/pkg/schema"
)

func TestRunDeterministic(t *testing.T) {
	s := schema.Scenario{
		Name: "simple",
		Workload: schema.Workload{
			Name:     "wl",
			RPS:      2,
			Duration: 2,
			Batch:    1,
		},
		Pipeline: []schema.Stage{
			{Name: "pre", Kind: schema.StageFixedMs, Value: 1},
			{Name: "h2d", Kind: schema.StageBytes, Value: 10 * 1024 * 1024},
			{Name: "compute", Kind: schema.StageTokens, Value: 100},
			{Name: "d2h", Kind: schema.StageBytes, Value: 5 * 1024 * 1024},
		},
		Target: schema.GPUProfile{
			Name:        "TestGPU",
			TFLOPS:      50,
			MemGBps:     900,
			TokenCost:   0.1,
			H2DBandwGB:  30,
			D2HBandwGB:  30,
			Concurrency: 2,
		},
	}

	results, tr := Run(s)
	if len(results) != 4 { // 2 rps * 2s
		t.Fatalf("expected 4 requests, got %d", len(results))
	}
	if len(tr.Events) == 0 {
		t.Fatalf("expected trace events")
	}
	sum := Summarize(results, s.Workload.Duration, s.Target)
	if sum.Throughput <= 0 {
		t.Fatalf("throughput should be >0")
	}
	if sum.P50LatencyMS <= 0 {
		t.Fatalf("latency should be >0")
	}
}
