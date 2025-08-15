package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// RouteCommand defines the command pattern for route operations
type RouteCommand interface {
	Execute(r chi.Router) error
	GetName() string
}

// RouteState defines the state pattern for route registration
type RouteState interface {
	Register(r chi.Router) error
	GetName() string
	Transition() RouteState
}

// BaseRouteState provides common state functionality
type BaseRouteState struct {
	context *RouteContext
}

// NewBaseRouteState creates a new base route state
func NewBaseRouteState(context *RouteContext) *BaseRouteState {
	return &BaseRouteState{
		context: context,
	}
}

// DocumentationState represents the documentation route registration state
type DocumentationState struct {
	*BaseRouteState
}

// NewDocumentationState creates a new documentation state
func NewDocumentationState(context *RouteContext) *DocumentationState {
	return &DocumentationState{
		BaseRouteState: NewBaseRouteState(context),
	}
}

// GetName returns the state name
func (ds *DocumentationState) GetName() string {
	return "Documentation"
}

// Register registers documentation routes
func (ds *DocumentationState) Register(r chi.Router) error {
	// Register redirects
	redirects := map[string]string{
		"/api":     "/api/",
		"/redoc":   "/redoc/",
		"/rapidoc": "/rapidoc/",
		"/scalar":  "/scalar/",
	}

	for from, to := range redirects {
		r.Get(from, func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, to, http.StatusFound)
		})
	}

	// Register OpenAPI spec handler
	specHandler := NewOpenAPISpecHandler()
	r.Get("/openapi.json", specHandler.ServeSpec)

	return nil
}

// Transition transitions to the next state
func (ds *DocumentationState) Transition() RouteState { //nolint:ireturn
	return NewScalarState(ds.context)
}

// ScalarState represents the scalar route registration state
type ScalarState struct {
	*BaseRouteState
}

// NewScalarState creates a new scalar state
func NewScalarState(context *RouteContext) *ScalarState {
	return &ScalarState{
		BaseRouteState: NewBaseRouteState(context),
	}
}

// GetName returns the state name
func (ss *ScalarState) GetName() string {
	return "Scalar"
}

// Register registers scalar routes
func (ss *ScalarState) Register(r chi.Router) error {
	// Register scalar viewer
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
		<div id="scalar-fallback" style="display: none; padding: 20px; text-align: center; color: #666;">
			Loading Scalar API Reference...
		</div>
	</body>
</html>`
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(scalarHTML))
	})

	return nil
}

// Transition transitions to the next state
func (ss *ScalarState) Transition() RouteState { //nolint:ireturn
	return NewDBAdminState(ss.context)
}

// DBAdminState represents the database admin route registration state
type DBAdminState struct {
	*BaseRouteState
}

// NewDBAdminState creates a new database admin state
func NewDBAdminState(context *RouteContext) *DBAdminState {
	return &DBAdminState{
		BaseRouteState: NewBaseRouteState(context),
	}
}

// GetName returns the state name
func (das *DBAdminState) GetName() string {
	return "DBAdmin"
}

// Register registers database admin routes
func (das *DBAdminState) Register(r chi.Router) error {
	// Register database admin routes
	r.HandleFunc(pathDBAdmin, func(w http.ResponseWriter, _ *http.Request) {
		// Database admin functionality
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("<h1>Database Admin</h1><p>Database administration interface</p>"))
	})

	return nil
}

// Transition transitions to the next state (final state)
func (das *DBAdminState) Transition() RouteState { //nolint:ireturn
	return nil // Final state
}

// RouteStateMachine manages the state transitions
type RouteStateMachine struct {
	currentState RouteState
}

// NewRouteStateMachine creates a new route state machine
func NewRouteStateMachine(initialState RouteState) *RouteStateMachine {
	return &RouteStateMachine{
		currentState: initialState,
	}
}

// RegisterAll registers all routes by transitioning through states
func (rsm *RouteStateMachine) RegisterAll(r chi.Router) error {
	for rsm.currentState != nil {
		if err := rsm.currentState.Register(r); err != nil {
			return err
		}
		rsm.currentState = rsm.currentState.Transition()
	}
	return nil
}

// RouteCommandInvoker manages command execution
type RouteCommandInvoker struct {
	commands []RouteCommand
}

// NewRouteCommandInvoker creates a new command invoker
func NewRouteCommandInvoker() *RouteCommandInvoker {
	return &RouteCommandInvoker{
		commands: []RouteCommand{},
	}
}

// AddCommand adds a command to the invoker
func (rci *RouteCommandInvoker) AddCommand(command RouteCommand) {
	rci.commands = append(rci.commands, command)
}

// ExecuteAll executes all commands
func (rci *RouteCommandInvoker) ExecuteAll(r chi.Router) error {
	for _, command := range rci.commands {
		if err := command.Execute(r); err != nil {
			return err
		}
	}
	return nil
}
