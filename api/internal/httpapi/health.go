package httpapi

import (
	"context"
	"net/http"
)

type ReadinessCheck func(context.Context) error

type healthHandler struct {
	ready ReadinessCheck
}

func (h *healthHandler) live(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *healthHandler) readyz(w http.ResponseWriter, r *http.Request) {
	if h.ready == nil {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
		return
	}
	if err := h.ready(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "unavailable",
			"reason": err.Error(),
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}
