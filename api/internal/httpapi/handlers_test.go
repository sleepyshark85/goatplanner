package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"goatplanner/internal/booking"
	"goatplanner/internal/httpapi"
)

// fakeService implements httpapi.BookingService with no DB.
type fakeService struct {
	mu        sync.Mutex
	bookings  []booking.Booking
	createErr error
	listErr   error
}

func (f *fakeService) Create(_ context.Context, in booking.CreateInput) (booking.Booking, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.createErr != nil {
		return booking.Booking{}, f.createErr
	}
	b := booking.Booking{
		ID:        "fake-id",
		CourtName: in.CourtName,
		TeamName:  in.TeamName,
		StartAt:   in.StartAt.UTC(),
		EndAt:     in.EndAt.UTC(),
		Status:    booking.StatusApproved,
		CreatedAt: time.Date(2026, 5, 22, 12, 0, 0, 0, time.UTC),
	}
	f.bookings = append(f.bookings, b)
	return b, nil
}

func (f *fakeService) List(_ context.Context) ([]booking.Booking, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.bookings, nil
}

func newTestRouter(t *testing.T, svc httpapi.BookingService) http.Handler {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return httpapi.NewRouter(
		httpapi.Deps{Service: svc, Logger: logger},
		httpapi.Config{
			AllowedOrigins:  []string{"*"},
			WriteTimeout:    5 * time.Second,
			MaxRequestBytes: 1 << 20,
		},
	)
}

func doJSON(t *testing.T, h http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}
	req := httptest.NewRequestWithContext(context.Background(), method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	return rr
}

func TestHealth_Live(t *testing.T) {
	h := newTestRouter(t, &fakeService{})
	rr := doJSON(t, h, http.MethodGet, "/healthz", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("healthz: want 200, got %d", rr.Code)
	}
}

func TestHealth_Ready_UsesInjectedCheck(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	failing := httpapi.NewRouter(httpapi.Deps{
		Service:        &fakeService{},
		Logger:         logger,
		ReadinessCheck: func(context.Context) error { return errors.New("db down") },
	}, httpapi.Config{AllowedOrigins: []string{"*"}, WriteTimeout: 5 * time.Second, MaxRequestBytes: 1 << 20})

	rr := doJSON(t, failing, http.MethodGet, "/readyz", nil)
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("want 503, got %d, body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "db down") {
		t.Errorf("expected reason in body, got %s", rr.Body.String())
	}
}

func TestCreateBooking_DelegatesToService(t *testing.T) {
	svc := &fakeService{}
	h := newTestRouter(t, svc)
	rr := doJSON(t, h, http.MethodPost, "/bookings", map[string]any{
		"court_name": "Court 1",
		"team_name":  "Goats FC",
		"start_at":   "2026-05-20T18:00:00Z",
		"end_at":     "2026-05-20T19:00:00Z",
	})
	if rr.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d, body=%s", rr.Code, rr.Body.String())
	}
	var out map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out["id"] != "fake-id" {
		t.Errorf("id from service not propagated: got %v", out["id"])
	}
	if out["status"] != "APPROVED" {
		t.Errorf("status: got %v", out["status"])
	}
	if len(svc.bookings) != 1 {
		t.Errorf("service should have 1 booking, got %d", len(svc.bookings))
	}
}

func TestCreateBooking_TimeRangeErrorBecomes400(t *testing.T) {
	svc := &fakeService{createErr: booking.ErrInvalidTimeRange}
	h := newTestRouter(t, svc)
	rr := doJSON(t, h, http.MethodPost, "/bookings", map[string]any{
		"court_name": "Court 1",
		"team_name":  "Goats FC",
		"start_at":   "2026-05-20T18:00:00Z",
		"end_at":     "2026-05-20T19:00:00Z",
	})
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d, body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "after") {
		t.Errorf("expected detail to mention 'after', got %s", rr.Body.String())
	}
}

func TestCreateBooking_OtherServiceErrorBecomes500(t *testing.T) {
	svc := &fakeService{createErr: errors.New("boom")}
	h := newTestRouter(t, svc)
	rr := doJSON(t, h, http.MethodPost, "/bookings", map[string]any{
		"court_name": "Court 1",
		"team_name":  "Goats FC",
		"start_at":   "2026-05-20T18:00:00Z",
		"end_at":     "2026-05-20T19:00:00Z",
	})
	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("want 500, got %d, body=%s", rr.Code, rr.Body.String())
	}
}

func TestCreateBooking_SchemaValidation(t *testing.T) {
	h := newTestRouter(t, &fakeService{})

	cases := []struct {
		name       string
		body       map[string]any
		wantStatus int
		wantSubstr string
	}{
		{"missing court", map[string]any{"team_name": "X", "start_at": "2026-05-20T18:00:00Z", "end_at": "2026-05-20T19:00:00Z"}, http.StatusUnprocessableEntity, "court_name"},
		{"missing team", map[string]any{"court_name": "C", "start_at": "2026-05-20T18:00:00Z", "end_at": "2026-05-20T19:00:00Z"}, http.StatusUnprocessableEntity, "team_name"},
		{"empty court", map[string]any{"court_name": "", "team_name": "T", "start_at": "2026-05-20T18:00:00Z", "end_at": "2026-05-20T19:00:00Z"}, http.StatusUnprocessableEntity, "court_name"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := doJSON(t, h, http.MethodPost, "/bookings", tc.body)
			if rr.Code != tc.wantStatus {
				t.Fatalf("want %d, got %d, body=%s", tc.wantStatus, rr.Code, rr.Body.String())
			}
			if !strings.Contains(rr.Body.String(), tc.wantSubstr) {
				t.Errorf("expected error body to contain %q, got %s", tc.wantSubstr, rr.Body.String())
			}
		})
	}
}

func TestListBookings_DelegatesToService(t *testing.T) {
	svc := &fakeService{
		bookings: []booking.Booking{
			{ID: "1", CourtName: "C", TeamName: "T", StartAt: time.Now(), EndAt: time.Now().Add(time.Hour), Status: booking.StatusApproved, CreatedAt: time.Now()},
		},
	}
	h := newTestRouter(t, svc)
	rr := doJSON(t, h, http.MethodGet, "/bookings", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rr.Code)
	}
	var got []map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(got) != 1 || got[0]["id"] != "1" {
		t.Errorf("unexpected response: %+v", got)
	}
}

func TestOpenAPISpecServed(t *testing.T) {
	h := newTestRouter(t, &fakeService{})
	rr := doJSON(t, h, http.MethodGet, "/openapi.json", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rr.Code)
	}
	var spec map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &spec); err != nil {
		t.Fatalf("decode spec: %v", err)
	}
	if v, _ := spec["openapi"].(string); !strings.HasPrefix(v, "3.") {
		t.Fatalf("openapi version: got %q", v)
	}
	paths, _ := spec["paths"].(map[string]any)
	if _, ok := paths["/bookings"]; !ok {
		t.Fatalf("/bookings not in spec paths")
	}
}
