package log

import (
    "context"
    "log/slog"
    "os"
    "strings"
)

type CtxKey struct{}

// FromContext returns a slog.Logger stored in context or the default logger.
func FromContext(ctx context.Context) *slog.Logger {
    if ctx == nil {
        return slog.Default()
    }
    if v := ctx.Value(CtxKey{}); v != nil {
        if lgr, ok := v.(*slog.Logger); ok && lgr != nil {
            return lgr
        }
    }
    return slog.Default()
}

// With returns a child logger with additional attributes.
func With(ctx context.Context, attrs ...any) context.Context {
    l := FromContext(ctx).With(attrs...)
    return context.WithValue(ctx, CtxKey{}, l)
}

// Setup configures the global logger based on level and format.
func Setup(level, format string) {
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

    var handler slog.Handler
    switch strings.ToLower(format) {
    case "text":
        handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
    default:
        handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
    }
    slog.SetDefault(slog.New(handler))
}
