// Package httpapi wires HTTP routing, handlers, and admin utilities.
package httpapi

import (
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/mdco1990/webapp/internal/repository"
)

const pathDBAdmin = "/db-admin"

// registerAdminRoutes wires Swagger UI and DB admin proxy (admin only)
func registerAdminRoutes(r chi.Router, repo *repository.Repository) {
	// Swagger UI endpoint - serve the UI with our spec at /api/
	r.Group(func(g chi.Router) {
		g.Use(AdminOnly(repo))
		g.HandleFunc("/api/", func(w http.ResponseWriter, _ *http.Request) {
			// Serve Swagger UI with our OpenAPI spec shipped in docs
			swaggerHTML := `<!DOCTYPE html>
<html>
<head>
    <title>API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
        SwaggerUIBundle({
            url: '/docs/swagger.yaml',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout"
        });
    };
    </script>
</body>
</html>`
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(swaggerHTML))
		})
	})

	// Internal DB Admin UI reverse proxy (kept inside the docker network)
	r.With(AdminOnly(repo)).Get(pathDBAdmin, func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/db-admin/", http.StatusFound)
	})
	r.Route(pathDBAdmin, func(adm chi.Router) {
		adm.Use(AdminOnly(repo))
		targetURL, _ := url.Parse("http://sqlite-admin:8080")
		proxy := httputil.NewSingleHostReverseProxy(targetURL)
		proxy.Director = func(req *http.Request) {
			req.URL.Scheme = targetURL.Scheme
			req.URL.Host = targetURL.Host
			host := req.Host
			if host == "" {
				host = "api"
			}
			req.Header.Set("X-Forwarded-Host", host)
			req.Header.Set("X-Forwarded-Proto", "http")
			req.Header.Set("X-Forwarded-Prefix", "/db-admin")
		}
		adm.Mount("/", http.StripPrefix(pathDBAdmin, proxy))
	})
}
