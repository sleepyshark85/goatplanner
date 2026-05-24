package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

const (
	apiTitle       = "GoatPlanner API"
	apiVersion     = "0.1.0"
	apiDescription = "Tennis court booking API."
)

type Deps struct {
	Service        BookingService
	ReadinessCheck ReadinessCheck
	Logger         *slog.Logger
}

func NewRouter(deps Deps, cfg Config) http.Handler {
	logger := deps.Logger
	if logger == nil {
		logger = slog.Default()
	}

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(requestLogger(logger))
	r.Use(recoverer(logger))
	r.Use(middleware.Timeout(cfg.WriteTimeout))
	r.Use(maxBytes(cfg.MaxRequestBytes))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-Id"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	health := &healthHandler{ready: deps.ReadinessCheck}
	r.Get("/healthz", health.live)
	r.Get("/readyz", health.readyz)

	registerBookingsAPI(r, deps.Service, logger)

	return r
}

func registerBookingsAPI(r chi.Router, svc BookingService, logger *slog.Logger) huma.API {
	cfg := huma.DefaultConfig(apiTitle, apiVersion)
	cfg.Info.Description = apiDescription
	api := humachi.New(r, cfg)

	h := &bookingsHandler{svc: svc, logger: logger}

	huma.Register(api, huma.Operation{
		OperationID: "list-bookings",
		Method:      http.MethodGet,
		Path:        "/bookings",
		Summary:     "List bookings",
		Description: "Returns all bookings, ordered by start time (newest first).",
		Tags:        []string{"Bookings"},
	}, h.list)

	huma.Register(api, huma.Operation{
		OperationID:   "create-booking",
		Method:        http.MethodPost,
		Path:          "/bookings",
		Summary:       "Create a booking",
		Description:   "Creates a booking. Auto-approved on creation.",
		DefaultStatus: http.StatusCreated,
		Tags:          []string{"Bookings"},
	}, h.create)

	return api
}

func NewHTTPServer(handler http.Handler, cfg Config) *http.Server {
	return &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadTimeout:       cfg.ReadTimeout,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}
}

func maxBytes(limit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.ContentLength > limit {
				writeError(w, http.StatusRequestEntityTooLarge, "request body too large")
				return
			}
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, limit)
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
