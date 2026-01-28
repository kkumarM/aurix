package trace

import (
	"encoding/json"
)

// Event represents a Chrome Trace event.
type Event struct {
	Name string  `json:"name"`
	Cat  string  `json:"cat,omitempty"`
	Ph   string  `json:"ph"`
	Ts   float64 `json:"ts"`          // microseconds
	Dur  float64 `json:"dur,omitempty"` // microseconds
	Pid  int     `json:"pid,omitempty"`
	Tid  int     `json:"tid,omitempty"`
}

// Trace holds a list of events.
type Trace struct {
	Events []Event `json:"traceEvents"`
}

// New creates an empty trace.
func New() Trace {
	return Trace{Events: []Event{}}
}

// AddComplete adds a complete event given start/end in milliseconds.
func (t *Trace) AddComplete(name, cat string, startMs, endMs float64) {
	ev := Event{
		Name: name,
		Cat:  cat,
		Ph:   "X",
		Ts:   startMs * 1000,          // to microseconds
		Dur:  (endMs - startMs) * 1000,
		Pid:  1,
		Tid:  1,
	}
	t.Events = append(t.Events, ev)
}

// Finalize no-op placeholder to mirror interface for later enrichments.
func (t *Trace) Finalize() {}

// Marshal returns JSON bytes.
func (t *Trace) Marshal() ([]byte, error) {
	return json.MarshalIndent(t, "", "  ")
}
