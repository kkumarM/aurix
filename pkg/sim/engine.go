package sim

import (
	"math"
	"math/rand"
	"sort"
	"strings"

	"simulator/pkg/schema"
	"simulator/pkg/trace"
)

type StageTiming struct {
	Start float64
	End   float64
	Name  string
	Cat   string
}

type RequestResult struct {
	LatencyMS float64
	QueueMS   float64
	ArrivalMS float64
	StartMS   float64
	EndMS     float64
	Stages    []StageTiming
	ID        int
}

// Run executes a deterministic simulation for the scenario.
func Run(s schema.Scenario, seed int64) ([]RequestResult, trace.Trace) {
	reqCount := int(math.Round(s.Workload.Duration * s.Workload.RPS))
	if reqCount < 1 {
		reqCount = 1
	}

	interval := 1.0 / s.Workload.RPS
	concurrency := s.Target.Concurrency
	slotFree := make([]float64, concurrency) // seconds
	jitter := s.Workload.JitterPct
	if jitter == 0 {
		jitter = 5
	}
	rng := rand.New(rand.NewSource(seed))

	results := make([]RequestResult, 0, reqCount)
	tr := trace.New()

	var totalDuration float64
	var totalComputeBusy float64

	for i := 0; i < reqCount; i++ {
		arrival := jittered(interval*float64(i), jitter, rng)
		current := arrival
		var stages []StageTiming
		var queueWait float64
		var startFirst float64

		for _, st := range s.Pipeline {
			dur := stageDurationSeconds(st, s.Target)
			dur = jittered(dur, jitter, rng)

			usesGPU := isGPUStage(st)
			start := current
			if usesGPU {
				// find earliest slot
				slotIdx := 0
				for j := 1; j < concurrency; j++ {
					if slotFree[j] < slotFree[slotIdx] {
						slotIdx = j
					}
				}
				if slotFree[slotIdx] > start {
					waitStart := start
					waitEnd := slotFree[slotIdx]
					queueWait += (waitEnd - waitStart) * 1000.0
					stages = append(stages, StageTiming{
						Start: waitStart * 1000,
						End:   waitEnd * 1000,
						Name:  "queue",
						Cat:   "queue",
					})
					start = waitEnd
				}
				slotFree[slotIdx] = start + dur
				totalComputeBusy += dur
			}
			end := start + dur
			stages = append(stages, StageTiming{
				Start: start * 1000,
				End:   end * 1000,
				Name:  st.Name,
				Cat:   stageCategory(st),
			})
			current = end
			if startFirst == 0 {
				startFirst = start * 1000
			}
		}

		latency := (current - arrival) * 1000
		results = append(results, RequestResult{
			ID:        i,
			LatencyMS: latency,
			QueueMS:   queueWait,
			ArrivalMS: arrival * 1000,
			StartMS:   startFirst,
			EndMS:     current * 1000,
			Stages:    stages,
		})

		if current > totalDuration {
			totalDuration = current
		}

		// emit trace spans
		for _, st := range stages {
			tr.AddComplete(st.Name, st.Cat, laneForCat(st.Cat), st.Start, st.End)
		}
		// queue span if any
		if queueWait > 0 && len(stages) > 0 {
			qs := stages[0].Start - queueWait
			tr.AddComplete("queue", "queue", laneForCat("queue"), qs, stages[0].Start)
		}
	}

	// add metadata events for timeline readability
	tr.Finalize()
	return results, tr
}

func jittered(val float64, pct float64, rng *rand.Rand) float64 {
	if pct <= 0 {
		return val
	}
	scale := 1 + ((rng.Float64()*2 - 1) * pct / 100.0)
	return val * scale
}

func stageDurationSeconds(st schema.Stage, gpu schema.GPUProfile) float64 {
	switch st.Kind {
	case schema.StageFixedMs:
		return st.Value / 1000.0
	case schema.StageBytes:
		bw := gpu.MemGBps
		name := strings.ToLower(st.Name)
		if strings.Contains(name, "h2d") {
			bw = gpu.H2DBandwGB
		} else if strings.Contains(name, "d2h") {
			bw = gpu.D2HBandwGB
		}
		// value is bytes; bw is GB/s
		return (st.Value / 1e9) / bw
	case schema.StageTokens:
		if gpu.TokenCost > 0 {
			return (st.Value * gpu.TokenCost) / 1000.0
		}
		// fallback to flop-based: assume tokens ~ flops scaled by TFLOPS
		return st.Value / (gpu.TFLOPS * 1e6) // very rough
	default:
		return st.Value / 1000.0
	}
}

func isGPUStage(st schema.Stage) bool {
	if st.Kind == schema.StageTokens {
		return true
	}
	name := strings.ToLower(st.Name)
	return strings.Contains(name, "compute")
}

func stageCategory(st schema.Stage) string {
	switch st.Kind {
	case schema.StageBytes:
		name := strings.ToLower(st.Name)
		if strings.Contains(name, "h2d") {
			return "h2d"
		}
		if strings.Contains(name, "d2h") {
			return "d2h"
		}
		return "mem"
	case schema.StageTokens:
		return "compute"
	default:
		return "cpu"
	}
}

func laneForCat(cat string) int {
	switch cat {
	case "queue":
		return 5
	case "cpu":
		return 1
	case "h2d":
		return 2
	case "d2h":
		return 4
	case "mem":
		return 2
	case "compute":
		return 3
	default:
		return 1
	}
}

// Summarize computes metrics from request results.
func Summarize(results []RequestResult, durationS float64, gpu schema.GPUProfile) schema.Summary {
	if len(results) == 0 {
		return schema.Summary{}
	}
	latencies := make([]float64, len(results))
	var totalQueue float64
	for i, r := range results {
		latencies[i] = r.LatencyMS
		totalQueue += r.QueueMS
	}
	sort.Float64s(latencies)

	p := func(q float64) float64 {
		idx := int(math.Ceil(q/100*float64(len(latencies)))) - 1
		if idx < 0 {
			idx = 0
		}
		if idx >= len(latencies) {
			idx = len(latencies) - 1
		}
		return latencies[idx]
	}

	duration := durationS
	if duration == 0 {
		duration = 1
	}
	throughput := float64(len(results)) / duration

	avgQueue := totalQueue / float64(len(results))

	// crude GPU util: ratio of compute time to duration * concurrency not tracked per-stage here.
	util := math.Min(100, throughput*100/float64(gpu.Concurrency))

	return schema.Summary{
		Throughput:     throughput,
		P50LatencyMS:   p(50),
		P90LatencyMS:   p(90),
		P99LatencyMS:   p(99),
		AvgQueueMS:     avgQueue,
		GPUUtilization: util,
		TotalRequests:  len(results),
		DurationS:      duration,
	}
}
