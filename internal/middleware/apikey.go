package middleware

import (
	"net/http"
)

type APIKeyConfig struct {
	Header string
	Key    string
}

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
