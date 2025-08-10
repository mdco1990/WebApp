// Package middleware contains HTTP middleware for the API server.
package middleware

import (
	"net/http"
)

// APIKeyConfig configures simple header-based API key authentication.
type APIKeyConfig struct {
	Header string
	Key    string
}

// APIKeyAuth returns middleware that validates a shared API key in a header.
func APIKeyAuth(cfg APIKeyConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if cfg.Key == "" {
				next.ServeHTTP(w, r)
				return
			}
			if r.Header.Get(cfg.Header) != cfg.Key {
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte("unauthorized"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
