package workload

import (
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"simulator/pkg/cluster"
)

// GeneratorConfig defines parameters for synthetic workloads.
type GeneratorConfig struct {
	Pods         int
	GPUPods      int
	GPUType      string
	GPUMemMB     int
	GPUCount     int
	CPUFromMilli int
	CPUToMilli   int
	MemFromMB    int
	MemToMB      int
	PriorityFrom int
	PriorityTo   int
}

// ParseGeneratorConfig parses a comma-separated key=value string.
// Example: pods=50,gpuPods=20,gpuType=A100,gpuMemMB=40000,gpuCount=1,cpu=500-4000,memMB=512-8192,priority=1-100
func ParseGeneratorConfig(input string) (GeneratorConfig, error) {
	cfg := GeneratorConfig{
		Pods:         20,
		GPUPods:      8,
		GPUType:      "A100",
		GPUMemMB:     40000,
		GPUCount:     1,
		CPUFromMilli: 500,
		CPUToMilli:   4000,
		MemFromMB:    512,
		MemToMB:      8192,
		PriorityFrom: 1,
		PriorityTo:   100,
	}

	if input == "" {
		return cfg, nil
	}

	for _, part := range strings.Split(input, ",") {
		if part == "" {
			continue
		}
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			return cfg, fmt.Errorf("invalid workload generator arg %q", part)
		}
		key, val := kv[0], kv[1]
		switch key {
		case "pods":
			cfg.Pods = atoi(val, cfg.Pods)
		case "gpuPods":
			cfg.GPUPods = atoi(val, cfg.GPUPods)
		case "gpuType":
			cfg.GPUType = val
		case "gpuMemMB":
			cfg.GPUMemMB = atoi(val, cfg.GPUMemMB)
		case "gpuCount":
			cfg.GPUCount = atoi(val, cfg.GPUCount)
		case "cpu":
			cfg.CPUFromMilli, cfg.CPUToMilli = parseRange(val, cfg.CPUFromMilli, cfg.CPUToMilli)
		case "memMB":
			cfg.MemFromMB, cfg.MemToMB = parseRange(val, cfg.MemFromMB, cfg.MemToMB)
		case "priority":
			cfg.PriorityFrom, cfg.PriorityTo = parseRange(val, cfg.PriorityFrom, cfg.PriorityTo)
		default:
			return cfg, fmt.Errorf("unknown workload generator key %q", key)
		}
	}

	return cfg, nil
}

// Generate returns a slice of pods based on the generator config.
func Generate(cfg GeneratorConfig) []Pod {
	rand.Seed(time.Now().UnixNano())

	pods := make([]Pod, 0, cfg.Pods)
	for i := 0; i < cfg.Pods; i++ {
		isGPU := i < cfg.GPUPods
		name := fmt.Sprintf("pod-%02d", i)
		ns := "default"
		if isGPU {
			ns = "ml"
		}

		req := cluster.Resource{
			CPUMilli: randRange(cfg.CPUFromMilli, cfg.CPUToMilli),
			MemoryMB: randRange(cfg.MemFromMB, cfg.MemToMB),
			GPUs:     0,
		}

		var gpuType string
		var gpuMem int
		if isGPU {
			req.GPUs = cfg.GPUCount
			gpuType = cfg.GPUType
			gpuMem = cfg.GPUMemMB
		}

		priority := randRange(cfg.PriorityFrom, cfg.PriorityTo)
		pods = append(pods, Pod{
			Name:      name,
			Namespace: ns,
			Priority:  priority,
			Requests:  req,
			GPUType:   gpuType,
			GPUMemMB:  gpuMem,
		})
	}

	return pods
}

func atoi(val string, def int) int {
	if v, err := strconv.Atoi(val); err == nil {
		return v
	}
	return def
}

func parseRange(val string, defFrom, defTo int) (int, int) {
	parts := strings.SplitN(val, "-", 2)
	if len(parts) != 2 {
		return defFrom, defTo
	}
	from := atoi(parts[0], defFrom)
	to := atoi(parts[1], defTo)
	if to < from {
		to = from
	}
	return from, to
}

func randRange(min, max int) int {
	if max <= min {
		return min
	}
	return rand.Intn(max-min+1) + min
}
