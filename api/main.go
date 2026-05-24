package main

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"goatplanner/internal/booking"
	"goatplanner/internal/httpapi"
	"goatplanner/internal/sqlitestore"
)

func main() {
	cfg, err := LoadConfig()
	if err != nil {
		os.Stderr.WriteString("config error: " + err.Error() + "\n")
		os.Exit(1)
	}

	logger := newLogger(os.Stdout, cfg.LogFormat, cfg.LogLevel)
	slog.SetDefault(logger)

	db, err := sqlitestore.OpenDB(cfg.DatabasePath)
	if err != nil {
		logger.Error("open db", slog.String("err", err.Error()))
		os.Exit(1)
	}
	defer db.Close()

	if err := sqlitestore.RunMigrations(db); err != nil {
		logger.Error("run migrations", slog.String("err", err.Error()))
		os.Exit(1)
	}

	repo := sqlitestore.NewBookingRepository(db)
	svc := booking.NewService(repo)

	handler := httpapi.NewRouter(httpapi.Deps{
		Service:        svc,
		ReadinessCheck: db.PingContext,
		Logger:         logger,
	}, httpapi.Config{
		Addr:              cfg.Addr,
		AllowedOrigins:    cfg.AllowedOrigins,
		ReadTimeout:       cfg.ReadTimeout,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
		MaxRequestBytes:   cfg.MaxRequestBytes,
	})

	srv := httpapi.NewHTTPServer(handler, httpapi.Config{
		Addr:              cfg.Addr,
		ReadTimeout:       cfg.ReadTimeout,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	})

	serverErr := make(chan error, 1)
	go func() {
		logger.Info("server starting", slog.String("addr", cfg.Addr))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		logger.Error("server error", slog.String("err", err.Error()))
		os.Exit(1)
	case sig := <-stop:
		logger.Info("shutdown signal received", slog.String("signal", sig.String()))
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown failed", slog.String("err", err.Error()))
		os.Exit(1)
	}
	logger.Info("shutdown complete")
}

func newLogger(out io.Writer, format, level string) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	opts := &slog.HandlerOptions{Level: lvl}
	if format == "text" {
		return slog.New(slog.NewTextHandler(out, opts))
	}
	return slog.New(slog.NewJSONHandler(out, opts))
}
