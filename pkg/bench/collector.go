package bench

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// Collector runs a command and samples process + GPU metrics.
type Collector struct {
	Command  []string
	Duration time.Duration
	Interval time.Duration
}

// Run executes the command, samples stats until it exits or duration elapses,
// and returns a Profile plus raw samples.
func (c *Collector) Run(ctx context.Context) (Profile, error) {
	if len(c.Command) == 0 {
		return Profile{}, fmt.Errorf("no command provided")
	}
	ctx, cancel := context.WithTimeout(ctx, c.Duration)
	defer cancel()

	cmd := exec.CommandContext(ctx, c.Command[0], c.Command[1:]...)
	if err := cmd.Start(); err != nil {
		return Profile{}, fmt.Errorf("start command: %w", err)
	}
	pid := cmd.Process.Pid

	var cpuSamples []float64
	var memSamples []float64
	var gpuUtilSamples []float64
	var gpuMemSamples []float64
	var gpuType string

	ticker := time.NewTicker(c.Interval)
	defer ticker.Stop()
	start := time.Now()

	done := make(chan struct{})
	go func() {
		_ = cmd.Wait()
		close(done)
	}()

	for {
		select {
		case <-done:
			// One last sample after exit to catch final state.
			cpu, mem := sampleProc(pid)
			if cpu >= 0 {
				cpuSamples = append(cpuSamples, cpu)
			}
			if mem >= 0 {
				memSamples = append(memSamples, mem)
			}
			if util, gmem, gt, ok := sampleGPU(); ok {
				gpuUtilSamples = append(gpuUtilSamples, util)
				gpuMemSamples = append(gpuMemSamples, gmem)
				if gpuType == "" {
					gpuType = gt
				}
			}
			goto finish
		case <-ticker.C:
			cpu, mem := sampleProc(pid)
			if cpu >= 0 {
				cpuSamples = append(cpuSamples, cpu)
			}
			if mem >= 0 {
				memSamples = append(memSamples, mem)
			}
			if util, gmem, gt, ok := sampleGPU(); ok {
				gpuUtilSamples = append(gpuUtilSamples, util)
				gpuMemSamples = append(gpuMemSamples, gmem)
				if gpuType == "" {
					gpuType = gt
				}
			}
		}
	}

finish:
	duration := time.Since(start).Seconds()

	profile := Profile{
		Command:           strings.Join(c.Command, " "),
		DurationSec:       duration,
		SampleIntervalSec: c.Interval.Seconds(),
		CPUAvgMilli:       avg(cpuSamples),
		CPUPeakMilli:      peak(cpuSamples),
		MemAvgMB:          avg(memSamples),
		MemPeakMB:         peak(memSamples),
		GPUType:           gpuType,
		GPUAvgUtil:        avg(gpuUtilSamples),
		GPUPeakUtil:       peak(gpuUtilSamples),
		GPUAvgMemMB:       avg(gpuMemSamples),
		GPUPeakMemMB:      peak(gpuMemSamples),
	}

	return profile, nil
}

// sampleProc returns CPU millicores and memory MB for the process.
func sampleProc(pid int) (float64, float64) {
	// CPU: use ps to get %cpu then convert to millicores assuming 1 core = 100%.
	out, err := exec.Command("ps", "-p", fmt.Sprint(pid), "-o", "%cpu").Output()
	if err != nil {
		return -1, -1
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) < 2 {
		return -1, -1
	}
	val := strings.TrimSpace(lines[1])
	percent, err := strconv.ParseFloat(strings.ReplaceAll(val, ",", "."), 64)
	if err != nil {
		return -1, -1
	}
	cpuMilli := percent * 10 // 100% = 1000m

	// Mem: read from /proc/<pid>/status VmRSS in kB.
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/status", pid))
	if err != nil {
		return cpuMilli, -1
	}
	sc := bufio.NewScanner(bytes.NewReader(data))
	for sc.Scan() {
		line := sc.Text()
		if strings.HasPrefix(line, "VmRSS:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				kb, _ := strconv.Atoi(fields[1])
				return cpuMilli, float64(kb) / 1024.0
			}
		}
	}
	return cpuMilli, -1
}

// sampleGPU returns utilization %, memory MB, and type for GPU 0 (simple single-GPU read).
func sampleGPU() (float64, float64, string, bool) {
	if _, err := exec.LookPath("nvidia-smi"); err != nil {
		return 0, 0, "", false
	}
	out, err := exec.Command("nvidia-smi", "--query-gpu=utilization.gpu,memory.used,name", "--format=csv,noheader,nounits").Output()
	if err != nil {
		return 0, 0, "", false
	}
	line := strings.TrimSpace(string(out))
	parts := strings.Split(line, ",")
	if len(parts) < 3 {
		return 0, 0, "", false
	}
	util, _ := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	mem, _ := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	name := strings.TrimSpace(parts[2])
	return util, mem, name, true
}

func avg(vals []float64) float64 {
	if len(vals) == 0 {
		return 0
	}
	var s float64
	for _, v := range vals {
		s += v
	}
	return s / float64(len(vals))
}

func peak(vals []float64) float64 {
	var p float64
	for _, v := range vals {
		if v > p {
			p = v
		}
	}
	return p
}
