package main

import (
	"encoding/json"
	"hash/fnv"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"simulator/pkg/agent"
	"simulator/pkg/nsys"
	"simulator/pkg/schema"
	"simulator/pkg/sim"
)

type scenarioStore struct {
	mu        sync.RWMutex
	scenarios map[string]schema.Scenario
}

type runStore struct {
	mu   sync.RWMutex
	runs map[string]runRecord
}

type runRecord struct {
	result    schema.RunResult
	trace     []byte
	breakdown schema.Breakdown
}

type runRequest struct {
	ScenarioID string           `json:"scenario_id,omitempty"`
	Scenario   *schema.Scenario `json:"scenario,omitempty"`
}

var (
	scStore = scenarioStore{scenarios: map[string]schema.Scenario{}}
	rnStore = runStore{runs: map[string]runRecord{}}
)

func main() {
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}))

	r.Post("/v1/scenarios", handleCreateScenario)
	r.Get("/v1/scenarios/{id}", handleGetScenario)
	r.Post("/v1/runs", handleCreateRun)
	r.Get("/v1/runs", handleListRuns)
	r.Get("/v1/runs/compare", handleCompareRuns)
	r.Get("/v1/runs/{id}", handleGetRun)
	r.Delete("/v1/runs/{id}", handleDeleteRun)
	r.Get("/v1/runs/{id}/trace", handleGetTrace)
	r.Get("/v1/runs/{id}/breakdown", handleGetBreakdown)
	r.Post("/v1/agent/diagnose", handleAgentDiagnose)

	// Serve static files from web/dist
	workDir, _ := os.Getwd()
	filesDir := http.Dir(filepath.Join(workDir, "web", "dist"))
	r.Handle("/*", http.FileServer(filesDir))

	addr := ":8080"
	if v := os.Getenv("PORT"); v != "" {
		addr = ":" + v
	}

	// Load existing runs from disk
	loadAllRunsFromDisk()

	log.Printf("sim-api listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func handleCreateScenario(w http.ResponseWriter, r *http.Request) {
	var sc schema.Scenario
	if err := json.NewDecoder(r.Body).Decode(&sc); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := schema.ValidateScenario(sc); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	id := newID("sc")
	scStore.mu.Lock()
	scStore.scenarios[id] = sc
	scStore.mu.Unlock()
	writeJSON(w, http.StatusOK, map[string]string{"scenario_id": id})
}

func handleGetScenario(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	sc, ok := scStore.get(id)
	if !ok {
		writeError(w, http.StatusNotFound, "scenario not found")
		return
	}
	writeJSON(w, http.StatusOK, sc)
}

func (s *scenarioStore) get(id string) (schema.Scenario, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sc, ok := s.scenarios[id]
	return sc, ok
}

func handleCreateRun(w http.ResponseWriter, r *http.Request) {
	var req runRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	var sc schema.Scenario
	var ok bool
	if req.Scenario != nil {
		sc = *req.Scenario
	} else if req.ScenarioID != "" {
		sc, ok = scStore.get(req.ScenarioID)
		if !ok {
			writeError(w, http.StatusNotFound, "scenario not found")
			return
		}
	} else {
		writeError(w, http.StatusBadRequest, "scenario_id or scenario required")
		return
	}
	if err := schema.ValidateScenario(sc); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	runID := newID("run")
	seed := hashToInt(runID)

	results, tr := sim.Run(sc, seed)
	summary := sim.Summarize(results, sc.Workload.Duration, sc.Target)
	breakdown := sim.Breakdown(results)

	traceBytes, err := tr.Marshal()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to marshal trace")
		return
	}

	rec := runRecord{
		result: schema.RunResult{
			RunID:      runID,
			ScenarioID: req.ScenarioID,
			Summary:    summary,
			TracePath:  "/v1/runs/" + runID + "/trace",
		},
		trace:     traceBytes,
		breakdown: breakdown,
	}
	rnStore.mu.Lock()
	rnStore.runs[runID] = rec
	rnStore.mu.Unlock()

	if err := saveRunToDisk(rec); err != nil {
		log.Printf("failed to save run %s to disk: %v", runID, err)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"run_id":    runID,
		"summary":   summary,
		"breakdown": breakdown,
		"artifacts": map[string]string{"trace": rec.result.TracePath},
	})
}

func handleGetRun(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rec, ok := rnStore.get(id)
	if !ok {
		writeError(w, http.StatusNotFound, "run not found")
		return
	}
	writeJSON(w, http.StatusOK, rec.result)
}

func handleListRuns(w http.ResponseWriter, r *http.Request) {
	rnStore.mu.RLock()
	defer rnStore.mu.RUnlock()
	var runs []schema.RunResult
	for _, rec := range rnStore.runs {
		runs = append(runs, rec.result)
	}
	sort.Slice(runs, func(i, j int) bool {
		return runs[i].RunID > runs[j].RunID
	})
	writeJSON(w, http.StatusOK, runs)
}

func handleDeleteRun(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rnStore.mu.Lock()
	_, ok := rnStore.runs[id]
	if ok {
		delete(rnStore.runs, id)
	}
	rnStore.mu.Unlock()

	if !ok {
		writeError(w, http.StatusNotFound, "run not found")
		return
	}

	if err := deleteRunFromDisk(id); err != nil {
		log.Printf("failed to delete run %s from disk: %v", id, err)
		writeError(w, http.StatusInternalServerError, "failed to delete run from disk")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func handleGetTrace(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rec, ok := rnStore.get(id)
	if !ok {
		writeError(w, http.StatusNotFound, "run not found")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(rec.trace)
}

func handleGetBreakdown(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rec, ok := rnStore.get(id)
	if !ok {
		writeError(w, http.StatusNotFound, "run not found")
		return
	}
	writeJSON(w, http.StatusOK, rec.breakdown)
}

func handleCompareRuns(w http.ResponseWriter, r *http.Request) {
	baseID := r.URL.Query().Get("base")
	compareID := r.URL.Query().Get("compare")

	if baseID == "" || compareID == "" {
		writeError(w, http.StatusBadRequest, "base and compare query parameters are required")
		return
	}

	baseRec, ok := rnStore.get(baseID)
	if !ok {
		writeError(w, http.StatusNotFound, "base run not found")
		return
	}

	compareRec, ok := rnStore.get(compareID)
	if !ok {
		writeError(w, http.StatusNotFound, "compare run not found")
		return
	}

	comparison := sim.CompareRuns(baseRec.result.Summary, compareRec.result.Summary, baseID, compareID)
	writeJSON(w, http.StatusOK, comparison)
}

func handleAgentDiagnose(w http.ResponseWriter, r *http.Request) {
	var req agent.DiagnosisRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	resp := agent.DiagnoseRequest(req)
	writeJSON(w, http.StatusOK, resp)
}

func (r *runStore) get(id string) (runRecord, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	rec, ok := r.runs[id]
	return rec, ok
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func newID(prefix string) string {
	return prefix + "-" + time.Now().Format("20060102150405.000000000")
}

func hashToInt(s string) int64 {
	h := fnv.New64()
	_, _ = h.Write([]byte(s))
	return int64(h.Sum64())
}

// ---- Real trace handling ----
func handleUploadRealTrace(w http.ResponseWriter, r *http.Request) {
	if err := ensureArtifacts(); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot create artifacts dir")
		return
	}
	r.ParseMultipartForm(32 << 20)
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()
	id := newRealTraceID()
	stored, err := saveRealTraceFile(id, header.Filename, file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save file")
		return
	}
	// try parse if sqlite
	traceBytes := []byte{}
	metrics := nsys.Metrics{}
	if strings.HasSuffix(strings.ToLower(header.Filename), ".sqlite") {
		traceBytes, metrics, err = nsys.ParseSQLite(stored)
		if err != nil {
			writeError(w, http.StatusBadRequest, "failed to parse sqlite: "+err.Error())
			return
		}
		mb, _ := json.MarshalIndent(metrics, "", "  ")
		_, _ = saveMetrics(id, mb)
		_, _ = saveTraceBytes(id, traceBytes)
	}
	writeJSON(w, http.StatusOK, map[string]string{"real_trace_id": id})
}

func handleGetRealTrace(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tracePath, _ := realTracePaths(id)
	data, err := loadFile(tracePath)
	if err != nil {
		writeError(w, http.StatusNotFound, "trace not found")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func handleGetRealMetrics(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, metricsPath := realTracePaths(id)
	data, err := loadFile(metricsPath)
	if err != nil {
		writeError(w, http.StatusNotFound, "metrics not found")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
