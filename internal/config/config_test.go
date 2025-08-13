package config

import (
	"os"
	"testing"
	"time"
)

func TestLoad(t *testing.T) {
	// Test default values
	cfg := Load()

	if cfg.HTTPAddress != "127.0.0.1:8082" {
		t.Errorf("Expected default HTTP_ADDRESS 127.0.0.1:8082, got %s", cfg.HTTPAddress)
	}

	if cfg.DBDriver != "sqlite" {
		t.Errorf("Expected default DB_DRIVER sqlite, got %s", cfg.DBDriver)
	}

	if cfg.DBPath != "./data/app.db" {
		t.Errorf("Expected default DB_PATH ./data/app.db, got %s", cfg.DBPath)
	}

	if cfg.Env != "dev" {
		t.Errorf("Expected default ENV dev, got %s", cfg.Env)
	}

	if cfg.LogLevel != "info" {
		t.Errorf("Expected default LOG_LEVEL info, got %s", cfg.LogLevel)
	}

	if cfg.LogFormat != "json" {
		t.Errorf("Expected default LOG_FORMAT json, got %s", cfg.LogFormat)
	}
}

func TestLoadWithEnvironment(t *testing.T) {
	// Test environment variable override
	os.Setenv("HTTP_ADDRESS", "0.0.0.0:8080")
	os.Setenv("DB_DRIVER", "mysql")
	os.Setenv("DB_DSN", "user:pass@tcp(localhost:3306)/db")
	os.Setenv("ENV", "prod")
	os.Setenv("LOG_LEVEL", "debug")
	os.Setenv("LOG_FORMAT", "text")

	defer func() {
		os.Unsetenv("HTTP_ADDRESS")
		os.Unsetenv("DB_DRIVER")
		os.Unsetenv("DB_DSN")
		os.Unsetenv("ENV")
		os.Unsetenv("LOG_LEVEL")
		os.Unsetenv("LOG_FORMAT")
	}()

	cfg := Load()

	if cfg.HTTPAddress != "0.0.0.0:8080" {
		t.Errorf("Expected HTTP_ADDRESS 0.0.0.0:8080, got %s", cfg.HTTPAddress)
	}

	if cfg.DBDriver != "mysql" {
		t.Errorf("Expected DB_DRIVER mysql, got %s", cfg.DBDriver)
	}

	if cfg.DBDSN != "user:pass@tcp(localhost:3306)/db" {
		t.Errorf("Expected DB_DSN user:pass@tcp(localhost:3306)/db, got %s", cfg.DBDSN)
	}

	if cfg.Env != "prod" {
		t.Errorf("Expected ENV prod, got %s", cfg.Env)
	}

	if cfg.LogLevel != "debug" {
		t.Errorf("Expected LOG_LEVEL debug, got %s", cfg.LogLevel)
	}

	if cfg.LogFormat != "text" {
		t.Errorf("Expected LOG_FORMAT text, got %s", cfg.LogFormat)
	}
}

func TestCORSAllowedOrigins(t *testing.T) {
	tests := []struct {
		name     string
		env      string
		expected []string
	}{
		{
			name:     "comma separated",
			env:      "http://localhost:3000,http://localhost:5173",
			expected: []string{"http://localhost:3000", "http://localhost:5173"},
		},
		{
			name:     "space separated",
			env:      "http://localhost:3000 http://localhost:5173",
			expected: []string{"http://localhost:3000", "http://localhost:5173"},
		},
		{
			name:     "single origin",
			env:      "http://localhost:3000",
			expected: []string{"http://localhost:3000"},
		},
		{
			name:     "empty string",
			env:      "",
			expected: []string{"http://localhost:5173"}, // default
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("CORS_ALLOWED_ORIGINS", tt.env)
			defer os.Unsetenv("CORS_ALLOWED_ORIGINS")

			cfg := Load()

			if len(cfg.CORSAllowedOrigins) != len(tt.expected) {
				t.Errorf("Expected %d origins, got %d", len(tt.expected), len(cfg.CORSAllowedOrigins))
				return
			}

			for i, expected := range tt.expected {
				if cfg.CORSAllowedOrigins[i] != expected {
					t.Errorf("Expected origin %d to be %s, got %s", i, expected, cfg.CORSAllowedOrigins[i])
				}
			}
		})
	}
}

func TestHTTPTimeouts(t *testing.T) {
	// Test default timeout values
	cfg := Load()

	expectedReadHeader := 5 * time.Second
	expectedRead := 15 * time.Second
	expectedWrite := 15 * time.Second
	expectedIdle := 60 * time.Second

	if cfg.ReadHeaderTimeout != expectedReadHeader {
		t.Errorf("Expected ReadHeaderTimeout %v, got %v", expectedReadHeader, cfg.ReadHeaderTimeout)
	}

	if cfg.ReadTimeout != expectedRead {
		t.Errorf("Expected ReadTimeout %v, got %v", expectedRead, cfg.ReadTimeout)
	}

	if cfg.WriteTimeout != expectedWrite {
		t.Errorf("Expected WriteTimeout %v, got %v", expectedWrite, cfg.WriteTimeout)
	}

	if cfg.IdleTimeout != expectedIdle {
		t.Errorf("Expected IdleTimeout %v, got %v", expectedIdle, cfg.IdleTimeout)
	}
}

func TestHTTPTimeoutsWithEnvironment(t *testing.T) {
	os.Setenv("HTTP_READ_HEADER_TIMEOUT_MS", "1000")
	os.Setenv("HTTP_READ_TIMEOUT_MS", "2000")
	os.Setenv("HTTP_WRITE_TIMEOUT_MS", "3000")
	os.Setenv("HTTP_IDLE_TIMEOUT_MS", "4000")

	defer func() {
		os.Unsetenv("HTTP_READ_HEADER_TIMEOUT_MS")
		os.Unsetenv("HTTP_READ_TIMEOUT_MS")
		os.Unsetenv("HTTP_WRITE_TIMEOUT_MS")
		os.Unsetenv("HTTP_IDLE_TIMEOUT_MS")
	}()

	cfg := Load()

	expectedReadHeader := 1 * time.Second
	expectedRead := 2 * time.Second
	expectedWrite := 3 * time.Second
	expectedIdle := 4 * time.Second

	if cfg.ReadHeaderTimeout != expectedReadHeader {
		t.Errorf("Expected ReadHeaderTimeout %v, got %v", expectedReadHeader, cfg.ReadHeaderTimeout)
	}

	if cfg.ReadTimeout != expectedRead {
		t.Errorf("Expected ReadTimeout %v, got %v", expectedRead, cfg.ReadTimeout)
	}

	if cfg.WriteTimeout != expectedWrite {
		t.Errorf("Expected WriteTimeout %v, got %v", expectedWrite, cfg.WriteTimeout)
	}

	if cfg.IdleTimeout != expectedIdle {
		t.Errorf("Expected IdleTimeout %v, got %v", expectedIdle, cfg.IdleTimeout)
	}
}

func TestGetenv(t *testing.T) {
	// Test default value
	value := getenv("NONEXISTENT_KEY", "default_value")
	if value != "default_value" {
		t.Errorf("Expected default value 'default_value', got %s", value)
	}

	// Test environment variable override
	os.Setenv("TEST_KEY", "test_value")
	defer os.Unsetenv("TEST_KEY")

	value = getenv("TEST_KEY", "default_value")
	if value != "test_value" {
		t.Errorf("Expected environment value 'test_value', got %s", value)
	}
}

func TestParseInt(t *testing.T) {
	// Test default value
	value := ParseInt("NONEXISTENT_KEY", 42)
	if value != 42 {
		t.Errorf("Expected default value 42, got %d", value)
	}

	// Test valid integer
	os.Setenv("TEST_INT", "123")
	defer os.Unsetenv("TEST_INT")

	value = ParseInt("TEST_INT", 42)
	if value != 123 {
		t.Errorf("Expected environment value 123, got %d", value)
	}

	// Test invalid integer (should return default)
	os.Setenv("TEST_INVALID", "not_a_number")
	defer os.Unsetenv("TEST_INVALID")

	value = ParseInt("TEST_INVALID", 42)
	if value != 42 {
		t.Errorf("Expected default value 42 for invalid input, got %d", value)
	}
}

func TestDurationFromMillis(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected time.Duration
	}{
		{"valid milliseconds", "5000", 5 * time.Second},
		{"zero milliseconds", "0", 0},
		{"negative milliseconds", "-1000", 0},
		{"invalid string", "not_a_number", 0},
		{"empty string", "", 0},
		{"whitespace", "  1000  ", 1 * time.Second},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := durationFromMillis(tt.input)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestConfigValidation(t *testing.T) {
	// Test empty HTTP_ADDRESS
	os.Setenv("HTTP_ADDRESS", "")
	defer os.Unsetenv("HTTP_ADDRESS")

	// This should not panic and should use default
	cfg := Load()
	if cfg.HTTPAddress == "" {
		t.Error("Expected HTTP_ADDRESS to have a default value")
	}

	// Test SQLite validation
	os.Setenv("DB_DRIVER", "sqlite")
	os.Setenv("DB_PATH", "")
	defer func() {
		os.Unsetenv("DB_DRIVER")
		os.Unsetenv("DB_PATH")
	}()

	// This should not panic and should use default
	cfg = Load()
	if cfg.DBPath == "" {
		t.Error("Expected DB_PATH to have a default value for SQLite")
	}

	// Test MySQL validation - this should work with valid DSN
	os.Setenv("DB_DRIVER", "mysql")
	os.Setenv("DB_DSN", "user:pass@tcp(localhost:3306)/testdb")
	defer func() {
		os.Unsetenv("DB_DRIVER")
		os.Unsetenv("DB_DSN")
	}()

	// This should not panic with valid DSN
	cfg = Load()
	if cfg.DBDSN != "user:pass@tcp(localhost:3306)/testdb" {
		t.Error("Expected DB_DSN to be set for MySQL driver")
	}
}
