# Security notes

This app is for personal use and small data, but basic hygiene still matters.

- Input validation: Use strong types and validate year (YYYY), month (1-12), amounts (>=0)
- SQL injection: Use parameterized queries only (database/sql with placeholders)
- Auth: Optional static API key via `X-API-Key` header; for multi-user or remote exposure, prefer OAuth2 / OIDC or at least per-user tokens
- Transport: Use HTTPS (reverse proxy like Caddy/Nginx/Traefik or Go's TLS) if exposed beyond localhost
- CORS: Restrict origins via config; disable credentials unless necessary
- Secrets: Do not commit real API keys; load from env or local files outside VCS
- Error handling: Do not leak driver errors to clients; map to generic messages
- Logging: Avoid logging sensitive data; use structured logs
- Rate limiting: Add simple IP token bucket if exposing publicly
- Content Security Policy (CSP): Serve frontend with strict CSP to reduce XSS risk
- Dependency updates: Keep Go and npm deps patched
- Backups: SQLite file backups should be encrypted when stored off-device
- File permissions: Ensure DB directory `data/` is chmod 700 (owner-only)
- DoS: Validate pagination limits and body sizes
- CSRF: If cookies/sessions are used; for API with bearer or API key, CSRF is less relevant

Known potential vulnerabilities if left as-is:
- Static API key is weak by design; not suitable for multi-user
- SQLite + filesystem backup can leak data if device compromised
- No per-user auth/roles; it's a single-user tool

Role-based access:
- Admin-only surfaces: Swagger UI at `/api/` and SQLite Web at `/db-admin/` require an authenticated admin session.
- Users table includes `is_admin` flag. Existing DBs are auto-migrated to add this column and promote `admin` user.
