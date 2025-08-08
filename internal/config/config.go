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
	DBPath             string
	CORSAllowedOrigins []string
	APIKey             string
	Env                string // dev or prod
}

// Load reads configuration from environment variables and optional .env file.
func Load() Config {
	_ = godotenv.Load()

	cfg := Config{
		HTTPAddress: getenv("HTTP_ADDRESS", "127.0.0.1:8080"),
		DBPath:      getenv("DB_PATH", "./data/app.db"),
		APIKey:      os.Getenv("API_KEY"),
		Env:         getenv("ENV", "dev"),
	}

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
	if cfg.DBPath == "" {
		log.Fatal("DB_PATH must not be empty")
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
