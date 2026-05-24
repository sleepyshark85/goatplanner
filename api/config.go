package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr              string
	DatabasePath      string
	LogLevel          string
	LogFormat         string
	AllowedOrigins    []string
	ReadTimeout       time.Duration
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
	MaxRequestBytes   int64
}

func LoadConfig() (Config, error) {
	cfg := Config{
		Addr:              getEnv("ADDR", ":8080"),
		DatabasePath:      getEnv("DATABASE_PATH", "goatplanner.db"),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
		LogFormat:         getEnv("LOG_FORMAT", "json"),
		AllowedOrigins:    splitCSV(getEnv("ALLOWED_ORIGINS", "*")),
		ReadTimeout:       getEnvDuration("READ_TIMEOUT", 15*time.Second),
		ReadHeaderTimeout: getEnvDuration("READ_HEADER_TIMEOUT", 5*time.Second),
		WriteTimeout:      getEnvDuration("WRITE_TIMEOUT", 15*time.Second),
		IdleTimeout:       getEnvDuration("IDLE_TIMEOUT", 60*time.Second),
		ShutdownTimeout:   getEnvDuration("SHUTDOWN_TIMEOUT", 15*time.Second),
		MaxRequestBytes:   getEnvInt64("MAX_REQUEST_BYTES", 1<<20),
	}
	if cfg.LogFormat != "json" && cfg.LogFormat != "text" {
		return cfg, fmt.Errorf("LOG_FORMAT must be 'json' or 'text', got %q", cfg.LogFormat)
	}
	return cfg, nil
}

func getEnv(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}

func getEnvDuration(key string, def time.Duration) time.Duration {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return def
	}
	return d
}

func getEnvInt64(key string, def int64) int64 {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return def
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return def
	}
	return n
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
