package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

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
	result schema.RunResult
	trace  []byte
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
	r.Get("/v1/runs/{id}", handleGetRun)
	r.Get("/v1/runs/{id}/trace", handleGetTrace)

	addr := ":8080"
	if v := os.Getenv("PORT"); v != "" {
		addr = ":" + v
	}
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

	results, tr := sim.Run(sc)
	summary := sim.Summarize(results, sc.Workload.Duration, sc.Target)

	traceBytes, err := tr.Marshal()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to marshal trace")
		return
	}

	runID := newID("run")
	rec := runRecord{
		result: schema.RunResult{
			RunID:      runID,
			ScenarioID: req.ScenarioID,
			Summary:    summary,
			TracePath:  "/v1/runs/" + runID + "/trace",
		},
		trace: traceBytes,
	}
	rnStore.mu.Lock()
	rnStore.runs[runID] = rec
	rnStore.mu.Unlock()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"run_id":    runID,
		"summary":   summary,
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
