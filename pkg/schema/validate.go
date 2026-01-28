package schema

import (
	"fmt"
)

// ValidateScenario checks required fields and ranges.
func ValidateScenario(s Scenario) error {
	if s.Name == "" {
		return fmt.Errorf("name is required")
	}
	if err := validateWorkload(s.Workload); err != nil {
		return err
	}
	if len(s.Pipeline) == 0 {
		return fmt.Errorf("pipeline must have at least one stage")
	}
	for i, st := range s.Pipeline {
		if st.Name == "" {
			return fmt.Errorf("pipeline[%d].name is required", i)
		}
		switch st.Kind {
		case StageFixedMs, StageBytes, StageTokens:
		default:
			return fmt.Errorf("pipeline[%d].kind invalid", i)
		}
		if st.Value <= 0 {
			return fmt.Errorf("pipeline[%d].value must be >0", i)
		}
	}
	if err := validateGPU(s.Target); err != nil {
		return err
	}
	return nil
}

func validateWorkload(w Workload) error {
	if w.Name == "" {
		return fmt.Errorf("workload.name is required")
	}
	if w.RPS <= 0 {
		return fmt.Errorf("workload.rps must be >0")
	}
	if w.Duration < 1 {
		return fmt.Errorf("workload.duration_s must be >=1")
	}
	if w.Batch < 1 {
		return fmt.Errorf("workload.batch_size must be >=1")
	}
	if w.JitterPct < 0 || w.JitterPct > 100 {
		return fmt.Errorf("workload.jitter_pct must be between 0 and 100")
	}
	return nil
}

func validateGPU(g GPUProfile) error {
	if g.Name == "" {
		return fmt.Errorf("target.name is required")
	}
	if g.TFLOPS <= 0 {
		return fmt.Errorf("target.tflops must be >0")
	}
	if g.MemGBps <= 0 {
		return fmt.Errorf("target.mem_gbps must be >0")
	}
	if g.TokenCost < 0 {
		return fmt.Errorf("target.ms_per_token must be >=0")
	}
	if g.H2DBandwGB <= 0 {
		return fmt.Errorf("target.h2d_gbps must be >0")
	}
	if g.D2HBandwGB <= 0 {
		return fmt.Errorf("target.d2h_gbps must be >0")
	}
	if g.Concurrency < 1 {
		return fmt.Errorf("target.concurrency must be >=1")
	}
	return nil
}
