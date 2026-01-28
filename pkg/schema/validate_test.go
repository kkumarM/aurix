package schema

import "testing"

func TestValidateScenario(t *testing.T) {
	s := Scenario{
		Name: "test",
		Workload: Workload{
			Name:     "wl",
			RPS:      10,
			Duration: 30,
			Batch:    1,
		},
		Pipeline: []Stage{
			{Name: "pre", Kind: StageFixedMs, Value: 2},
			{Name: "h2d", Kind: StageBytes, Value: 10 * 1024 * 1024},
			{Name: "compute", Kind: StageTokens, Value: 200},
		},
		Target: GPUProfile{
			Name:        "L40",
			TFLOPS:      182,
			MemGBps:     3000,
			TokenCost:   0.2,
			H2DBandwGB:  30,
			D2HBandwGB:  30,
			Concurrency: 4,
		},
	}
	if err := ValidateScenario(s); err != nil {
		t.Fatalf("expected valid scenario: %v", err)
	}
}

func TestValidateScenarioFailures(t *testing.T) {
	tests := []Scenario{
		{},                                              // missing all
		{Name: "x", Workload: Workload{Name: "w", RPS: 0, Duration: 5, Batch: 1}}, // rps 0
	}
	for i, s := range tests {
		if err := ValidateScenario(s); err == nil {
			t.Fatalf("test %d expected error", i)
		}
	}
}
