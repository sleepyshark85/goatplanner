package httpapi

import "time"

type Config struct {
	Addr              string
	AllowedOrigins    []string
	ReadTimeout       time.Duration
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	MaxRequestBytes   int64
}
