package config

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// ShutdownTimeout is used for graceful server shutdown.
const ShutdownTimeout = 10 * time.Second

// Config holds application configuration.
type Config struct {
	HTTPAddress        string
	DBPath             string // used when DBDriver=sqlite
	DBDriver           string // sqlite or mysql
	DBDSN              string // used when DBDriver!=sqlite
	CORSAllowedOrigins []string
	APIKey             string
	Env                string // dev or prod
	// Logging
	LogLevel  string // debug, info, warn, error
	LogFormat string // json or text
	// HTTP server timeouts
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
}

// Load reads configuration from environment variables and optional .env file.
func Load() Config {
	_ = godotenv.Load()

	cfg := Config{
		HTTPAddress: getenv("HTTP_ADDRESS", "127.0.0.1:8082"),
		DBPath:      getenv("DB_PATH", "./data/app.db"),
		DBDriver:    getenv("DB_DRIVER", "sqlite"),
		DBDSN:       os.Getenv("DB_DSN"),
		APIKey:      os.Getenv("API_KEY"),
		Env:         getenv("ENV", "dev"),
		LogLevel:    getenv("LOG_LEVEL", "info"),
		LogFormat:   getenv("LOG_FORMAT", "json"),
	}

	// HTTP timeouts (defaults suitable for APIs)
	cfg.ReadHeaderTimeout = durationFromMillis(getenv("HTTP_READ_HEADER_TIMEOUT_MS", "5000"))
	cfg.ReadTimeout = durationFromMillis(getenv("HTTP_READ_TIMEOUT_MS", "15000"))
	cfg.WriteTimeout = durationFromMillis(getenv("HTTP_WRITE_TIMEOUT_MS", "15000"))
	cfg.IdleTimeout = durationFromMillis(getenv("HTTP_IDLE_TIMEOUT_MS", "60000"))

	origins := getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
	// split by comma or space
	sep := ","
	if strings.Contains(origins, " ") && !strings.Contains(origins, ",") {
		sep = " "
	}
	for _, o := range strings.Split(origins, sep) {
		o = strings.TrimSpace(o)
		if o != "" {
			cfg.CORSAllowedOrigins = append(cfg.CORSAllowedOrigins, o)
		}
	}

	if cfg.HTTPAddress == "" {
		log.Fatal("HTTP_ADDRESS must not be empty")
	}
	switch cfg.DBDriver {
	case "sqlite":
		if cfg.DBPath == "" {
			log.Fatal("DB_PATH must not be empty for sqlite driver")
		}
	case "mysql":
		if cfg.DBDSN == "" {
			log.Fatal("DB_DSN must not be empty for mysql driver")
		}
	}

	return cfg
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// ParseInt parses an int env var safely.
func ParseInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return i
}

// durationFromMillis parses millisecond strings into time.Duration with sane fallback.
func durationFromMillis(ms string) time.Duration {
	i, err := strconv.Atoi(strings.TrimSpace(ms))
	if err != nil || i < 0 {
		return 0
	}
	return time.Duration(i) * time.Millisecond
}
