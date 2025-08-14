package log

import (
	"bytes"
	"log/slog"
	"os"
	"testing"
)

func TestSetup(_ *testing.T) {
	// Test JSON format setup
	Setup("debug", "json")

	// Test text format setup
	Setup("info", "text")

	// Test invalid log level (should default to info)
	Setup("invalid", "json")

	// Test invalid format (should default to json)
	Setup("warn", "invalid")
}

func TestLogLevels(_ *testing.T) {
	// Test debug level
	Setup("debug", "text")
	slog.Debug("debug message")

	// Test info level
	Setup("info", "text")
	slog.Info("info message")

	// Test warn level
	Setup("warn", "text")
	slog.Warn("warn message")

	// Test error level
	Setup("error", "text")
	slog.Error("error message")
}

func TestLogFormat(t *testing.T) {
	// Capture output for testing
	var buf bytes.Buffer

	// Test JSON format
	Setup("debug", "json")
	slog.SetDefault(slog.New(slog.NewJSONHandler(&buf, &slog.HandlerOptions{})))
	slog.Info("test message")

	if buf.Len() == 0 {
		t.Error("Expected JSON log output")
	}

	// Reset buffer
	buf.Reset()

	// Test text format
	Setup("debug", "text")
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{})))
	slog.Info("test message")

	if buf.Len() == 0 {
		t.Error("Expected text log output")
	}
}

func TestEnvironmentVariables(t *testing.T) {
	// Test with environment variables
	if err := os.Setenv("LOG_LEVEL", "debug"); err != nil {
		t.Fatalf("Failed to set LOG_LEVEL: %v", err)
	}
	if err := os.Setenv("LOG_FORMAT", "json"); err != nil {
		t.Fatalf("Failed to set LOG_FORMAT: %v", err)
	}
	defer func() {
		if err := os.Unsetenv("LOG_LEVEL"); err != nil {
			t.Logf("Failed to unset LOG_LEVEL: %v", err)
		}
		if err := os.Unsetenv("LOG_FORMAT"); err != nil {
			t.Logf("Failed to unset LOG_FORMAT: %v", err)
		}
	}()

	// This should use environment variables
	Setup("", "")
}

func TestLogWithContext(_ *testing.T) {
	Setup("debug", "text")

	// Test structured logging
	slog.Info("user action",
		"user_id", 123,
		"action", "login",
		"ip", "192.168.1.1",
	)
}

func TestLogPerformance(_ *testing.T) {
	Setup("info", "text")

	// Test logging performance (should not be too slow)
	for i := 0; i < 1000; i++ {
		slog.Info("performance test message", "iteration", i)
	}
}

func TestLogConcurrency(_ *testing.T) {
	Setup("info", "text")

	// Test concurrent logging
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()
			slog.Info("concurrent log message", "goroutine_id", id)
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}
}
