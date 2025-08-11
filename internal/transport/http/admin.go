// Package httpapi wires HTTP routing, handlers, and admin utilities.
package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/mdco1990/webapp/internal/repository"
	yaml "gopkg.in/yaml.v3"
)

const pathDBAdmin = "/db-admin"
const (
	headerContentType = "Content-Type"
	contentTypeHTML   = "text/html"
	contentTypeJSON   = "application/json"
)

// registerAdminRoutes wires Swagger UI and DB admin proxy (admin only)
func registerAdminRoutes(r chi.Router, repo *repository.Repository) {
	// Friendly redirects if user omits trailing slash (not auth-protected)
	r.Get("/api", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/api/", http.StatusFound)
	})
	r.Get("/redoc", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/redoc/", http.StatusFound)
	})
	r.Get("/rapidoc", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/rapidoc/", http.StatusFound)
	})
	r.Get("/scalar", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/scalar/", http.StatusFound)
	})

	// Public: /openapi.json (convert ./api/swagger.yaml to JSON)
	// Note: kept outside admin group so docs tools can fetch spec without auth.
	r.Get("/openapi.json", func(w http.ResponseWriter, _ *http.Request) {
		f, err := os.Open("api/swagger.yaml")
		if err != nil {
			http.Error(w, "spec not found", http.StatusNotFound)
			return
		}
		defer func() { _ = f.Close() }()
		data, err := io.ReadAll(f)
		if err != nil {
			http.Error(w, "failed to read spec", http.StatusInternalServerError)
			return
		}
		var v any
		if err := yaml.Unmarshal(data, &v); err != nil {
			http.Error(w, "invalid yaml", http.StatusInternalServerError)
			return
		}
		out, err := json.Marshal(v)
		if err != nil {
			http.Error(w, "failed to encode json", http.StatusInternalServerError)
			return
		}
		w.Header().Set(headerContentType, contentTypeJSON)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(out)
	})

	// Public: Scalar viewer at /scalar/
	r.HandleFunc("/scalar/", func(w http.ResponseWriter, _ *http.Request) {
		scalarHTML := `<!doctype html>
<html>
	<head>
		<meta charset="utf-8"/>
		<title>API Reference - Scalar</title>
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<style>
			html, body { height: 100%; }
			body { margin: 0; padding: 0; }
			/* ESM custom element layout (only when used) */
			api-reference { display: block; height: 100vh; width: 100vw; }
			/* UMD build mounts its own layout under .scalar-api-reference */
			.scalar-api-reference { height: 100vh; width: 100vw; }
			.fallback { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 16px; }
		</style>
			<script type="module">
				(async () => {
							const scriptCandidates = [
								// Prefer local vendored bundle first for offline/dev reliability
								'/docs/scalar.standalone.js',
								'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js',
								'https://unpkg.com/@scalar/api-reference@latest/dist/browser/standalone.min.js'
							];
					const esmCandidates = [
						'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest',
						'https://unpkg.com/@scalar/api-reference@latest',
						'https://esm.run/@scalar/api-reference'
					];

					let loaded = false;
					// Ensure UMD initialization hint exists for standalone build
					(function ensureUMDConfigTag(){
						if (!document.getElementById('api-reference')) {
							const tag = document.createElement('script');
							tag.id = 'api-reference';
							tag.setAttribute('data-url', '/openapi.json');
							document.body.appendChild(tag);
						}
					})();

					// Try classic script (UMD/IIFE) endpoints first
					for (const u of scriptCandidates) {
						if (loaded) break;
						loaded = await new Promise((resolve) => {
							const s = document.createElement('script');
							s.src = u;
							s.onload = () => { console.log('Scalar (script) loaded from', u); resolve(true); };
							s.onerror = () => { console.warn('Scalar script failed', u); resolve(false); };
							document.head.appendChild(s);
						});
					}

					// Fallback: ESM dynamic import endpoints
					if (!loaded) {
						// For ESM, inject a custom element target so it can render
						if (!document.querySelector('api-reference')) {
							const el = document.createElement('api-reference');
							el.setAttribute('spec-url', '/openapi.json');
							el.setAttribute('router', 'hash');
							document.body.appendChild(el);
						}
						for (const u of esmCandidates) {
							if (loaded) break;
							try { await import(u); console.log('Scalar (ESM) loaded from', u); loaded = true; }
							catch (e) { console.warn('Scalar ESM failed', u, e); }
						}
					}

					// Surface a helpful message if nothing mounted, with a generous timeout.
					const showFallback = () => {
						const el = document.getElementById('scalar-fallback');
						if (el) {
							el.style.display = 'block';
							el.innerText = 'Failed to load Scalar API Reference viewer. Check network/CDN access.';
						}
					};
					const hideFallbackIfMounted = () => {
						const hasWC = typeof customElements !== 'undefined' && customElements.get && customElements.get('api-reference') && document.querySelector('api-reference');
						const hasUMD = !!document.querySelector('.scalar-api-reference, .scalar-container, .scalar-app-layout');
						if (hasWC || hasUMD) {
							const el = document.getElementById('scalar-fallback');
							if (el) el.style.display = 'none';
							return true;
						}
						return false;
					};
					// Poll briefly to catch late mounts
					const start = Date.now();
					const maxWaitMs = 5000;
					const interval = setInterval(() => {
						if (hideFallbackIfMounted()) { clearInterval(interval); return; }
						if (Date.now() - start > maxWaitMs) { clearInterval(interval); showFallback(); }
					}, 200);
				})();
			</script>
	</head>
	<body>
		<div id="scalar-fallback" class="fallback" style="display:none"></div>
		<!-- UMD standalone build reads this tag to auto-mount -->
		<script id="api-reference" data-url="/openapi.json"></script>
	</body>
</html>`
		w.Header().Set(headerContentType, contentTypeHTML)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(scalarHTML))
	})

	// Also handle HEAD for /openapi.json to satisfy tools that probe with HEAD
	r.Method(
		"HEAD",
		"/openapi.json",
		http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set(headerContentType, contentTypeJSON)
			w.WriteHeader(http.StatusOK)
		}),
	)
	// Public docs: Redoc and RapiDoc
	r.HandleFunc("/redoc/", func(w http.ResponseWriter, _ *http.Request) {
		redocHTML := `<!doctype html>
<html>
	<head>
		<meta charset="utf-8"/>
		<title>API Reference - Redoc</title>
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<style> body { margin: 0; padding: 0; } </style>
		<script>
		(function() {
		  var urls = [
		    'https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js',
		    'https://cdn.jsdelivr.net/npm/redoc@2/bundles/redoc.standalone.js',
		    'https://unpkg.com/redoc@2/bundles/redoc.standalone.js',
		    '/docs/redoc.standalone.js'
		  ];
		  function load(i){
		    if(i>=urls.length){
		      console.error('Failed to load Redoc from all CDNs');
		      return;
		    }
		    var s=document.createElement('script');
		    s.src=urls[i];
		    s.crossOrigin='anonymous';
		    s.onload=function(){ console.log('Redoc loaded from', urls[i]); };
		    s.onerror=function(){ console.warn('Redoc CDN failed', urls[i]); load(i+1); };
		    document.head.appendChild(s);
		  }
		  load(0);
		})();
		</script>
	</head>
	<body>
		<redoc spec-url="/docs/swagger.yaml" hide-download-button="false" expand-responses="200,400,401,403,404"></redoc>
	</body>
</html>`
		w.Header().Set(headerContentType, contentTypeHTML)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(redocHTML))
	})

	r.HandleFunc("/rapidoc/", func(w http.ResponseWriter, _ *http.Request) {
		rapidocHTML := `<!doctype html>
<html>
	<head>
		<meta charset="utf-8"/>
		<title>API Reference - RapiDoc</title>
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
		<style> body { margin: 0; padding: 0; } </style>
	</head>
	<body>
		<rapi-doc spec-url="/docs/swagger.yaml" render-style="read" show-header="true" allow-try="true"
						theme="light" use-path-in-nav-bar="true" schema-style="table"
						allow-spec-url-load="false" allow-spec-file-load="false"></rapi-doc>
	</body>
</html>`
		w.Header().Set(headerContentType, contentTypeHTML)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(rapidocHTML))
	})

	// Swagger UI endpoint - keep admin-only at /api/
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
			w.Header().Set(headerContentType, contentTypeHTML)
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
