package cluster

import (
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"time"
)

// GeneratorConfig defines parameters for synthetic cluster creation.
type GeneratorConfig struct {
	Nodes           int
	GPUNodes        int
	GPUType         string
	GPUMemMB        int
	GPUCount        int
	CPUPerNode      int
	MemPerNodeMB    int
	CPUPerGPUNode   int
	MemPerGPUNodeMB int
}

// ParseGeneratorConfig parses a comma-separated key=value list.
// Example: nodes=4,gpuNodes=2,gpuType=A100,gpuMemMB=80000,gpuCount=4,cpu=16000,memMB=65536,cpuGPU=32000,memGPUMB=131072
func ParseGeneratorConfig(input string) (GeneratorConfig, error) {
	cfg := GeneratorConfig{
		Nodes:           4,
		GPUNodes:        2,
		GPUType:         "A100",
		GPUMemMB:        80000,
		GPUCount:        4,
		CPUPerNode:      8000,
		MemPerNodeMB:    16384,
		CPUPerGPUNode:   32000,
		MemPerGPUNodeMB: 131072,
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
			return cfg, fmt.Errorf("invalid cluster generator arg %q", part)
		}
		key, val := kv[0], kv[1]
		switch key {
		case "nodes":
			cfg.Nodes = atoi(val, cfg.Nodes)
		case "gpuNodes":
			cfg.GPUNodes = atoi(val, cfg.GPUNodes)
		case "gpuType":
			cfg.GPUType = val
		case "gpuMemMB":
			cfg.GPUMemMB = atoi(val, cfg.GPUMemMB)
		case "gpuCount":
			cfg.GPUCount = atoi(val, cfg.GPUCount)
		case "cpu":
			cfg.CPUPerNode = atoi(val, cfg.CPUPerNode)
		case "memMB":
			cfg.MemPerNodeMB = atoi(val, cfg.MemPerNodeMB)
		case "cpuGPU":
			cfg.CPUPerGPUNode = atoi(val, cfg.CPUPerGPUNode)
		case "memGPUMB":
			cfg.MemPerGPUNodeMB = atoi(val, cfg.MemPerGPUNodeMB)
		default:
			return cfg, fmt.Errorf("unknown cluster generator key %q", key)
		}
	}

	return cfg, nil
}

// Generate produces a cluster based on the generator config.
func Generate(cfg GeneratorConfig) *Cluster {
	rand.Seed(time.Now().UnixNano())

	nodes := make([]Node, 0, cfg.Nodes)
	// GPU nodes first
	for i := 0; i < cfg.GPUNodes && len(nodes) < cfg.Nodes; i++ {
		nodes = append(nodes, Node{
			Name: fmt.Sprintf("gpu-%d", i),
			Capacity: Resource{
				CPUMilli: cfg.CPUPerGPUNode,
				MemoryMB: cfg.MemPerGPUNodeMB,
				GPUs:     cfg.GPUCount,
			},
			GPU: GPU{
				Type:     cfg.GPUType,
				MemoryMB: cfg.GPUMemMB,
				Count:    cfg.GPUCount,
			},
		})
	}
	// remaining compute nodes
	for len(nodes) < cfg.Nodes {
		idx := len(nodes) - cfg.GPUNodes
		nodes = append(nodes, Node{
			Name: fmt.Sprintf("compute-%d", idx),
			Capacity: Resource{
				CPUMilli: cfg.CPUPerNode,
				MemoryMB: cfg.MemPerNodeMB,
				GPUs:     0,
			},
		})
	}

	return &Cluster{Nodes: nodes}
}

func atoi(val string, def int) int {
	if v, err := strconv.Atoi(val); err == nil {
		return v
	}
	return def
}
