package cluster

import (
	"encoding/json"
	"fmt"
	"os"
)

// Resource represents schedulable quantities on a node or requested by a pod.
type Resource struct {
	CPUMilli int `json:"cpuMilli"`
	MemoryMB int `json:"memoryMB"`
	GPUs     int `json:"gpus"`
}

// GPU describes identical GPUs attached to a node.
type GPU struct {
	Type     string  `json:"type,omitempty"`
	MemoryMB int     `json:"memoryMB,omitempty"`
	Count    int     `json:"count,omitempty"`
	SMs      int     `json:"sms,omitempty"`     // streaming multiprocessors
	TFLOPS   float64 `json:"tflops,omitempty"`  // peak FP32 TFLOPS
	MemGBps  float64 `json:"memGBps,omitempty"` // memory bandwidth in GB/s
}

// Add increases the resource values in place.
func (r *Resource) Add(other Resource) {
	r.CPUMilli += other.CPUMilli
	r.MemoryMB += other.MemoryMB
	r.GPUs += other.GPUs
}

// Minus returns the difference between two resources.
func (r Resource) Minus(other Resource) Resource {
	return Resource{
		CPUMilli: r.CPUMilli - other.CPUMilli,
		MemoryMB: r.MemoryMB - other.MemoryMB,
		GPUs:     r.GPUs - other.GPUs,
	}
}

// Node models a Kubernetes node with capacity and current allocations.
type Node struct {
	Name      string   `json:"name"`
	Capacity  Resource `json:"capacity"`
	GPU       GPU      `json:"gpu,omitempty"`
	Allocated Resource `json:"allocated,omitempty"`
}

// Remaining returns unallocated resources on the node.
func (n *Node) Remaining() Resource {
	return n.Capacity.Minus(n.Allocated)
}

// CanSchedule reports whether the node has enough free capacity for req.
func (n *Node) CanSchedule(req Resource) bool {
	remain := n.Remaining()
	gpuOK := remain.GPUs >= req.GPUs
	if n.HasGPU() {
		gpuOK = n.GPUAvailable() >= req.GPUs
	}
	return remain.CPUMilli >= req.CPUMilli &&
		remain.MemoryMB >= req.MemoryMB &&
		gpuOK
}

// Allocate consumes resources on the node. Caller should check CanSchedule first.
func (n *Node) Allocate(req Resource) {
	n.Allocated.Add(req)
}

// HasGPU indicates the node exposes at least one GPU.
func (n *Node) HasGPU() bool {
	return n.GPU.Count > 0
}

// GPUAvailable returns remaining GPU devices on the node.
func (n *Node) GPUAvailable() int {
	if n.GPU.Count == 0 {
		return 0
	}
	return n.GPU.Count - n.Allocated.GPUs
}

// Cluster is a collection of nodes.
type Cluster struct {
	Nodes []Node `json:"nodes"`
}

// Clone creates a deep copy so scheduling can mutate allocations safely.
func (c *Cluster) Clone() *Cluster {
	nodes := make([]Node, len(c.Nodes))
	copy(nodes, c.Nodes)
	return &Cluster{Nodes: nodes}
}

// Load reads a cluster definition from a JSON file.
func Load(path string) (*Cluster, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read cluster file: %w", err)
	}

	var c Cluster
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, fmt.Errorf("parse cluster json: %w", err)
	}

	return &c, nil
}
