package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/mdco1990/webapp/internal/repository"
)

// RouteRegistry defines the interface for route registration
type RouteRegistry interface {
	Register(r chi.Router) error
	GetRoutes() []RouteDefinition
}

// BaseRouteRegistry provides common functionality for route registries
type BaseRouteRegistry struct {
	// routes and context are reserved for future use
	// routes  []RouteDefinition
	// context *RouteContext
}

// RouteContext holds route configuration and dependencies
type RouteContext struct {
	repo *repository.Repository
}

// NewRouteContext creates a new route context
func NewRouteContext(repo *repository.Repository) *RouteContext {
	return &RouteContext{
		repo: repo,
	}
}

// RouteDefinition represents a route with its configuration
type RouteDefinition struct {
	Method     string
	Path       string
	Handler    http.HandlerFunc
	Middleware []func(http.Handler) http.Handler
}

// RouteStrategy defines the interface for different route strategies
type RouteStrategy interface {
	Register(r chi.Router, ctx *RouteContext) error
	GetName() string
}

// DocumentationRouteStrategy handles documentation-related routes
type DocumentationRouteStrategy struct{}

// GetName returns the strategy name
func (drs *DocumentationRouteStrategy) GetName() string {
	return "Documentation"
}

// Register registers documentation routes
func (drs *DocumentationRouteStrategy) Register(r chi.Router, _ *RouteContext) error {
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

// AdminRouteStrategy handles admin-specific routes
type AdminRouteStrategy struct{}

// GetName returns the strategy name
func (ars *AdminRouteStrategy) GetName() string {
	return "Admin"
}

// Register registers admin routes
func (ars *AdminRouteStrategy) Register(_ chi.Router, _ *RouteContext) error {
	// Admin-specific routes can be added here
	// For now, this is a placeholder for future admin functionality
	return nil
}

// RouteBuilder provides a fluent interface for building routes
type RouteBuilder struct {
	method     string
	path       string
	handler    http.HandlerFunc
	middleware []func(http.Handler) http.Handler
}

// NewRouteBuilder creates a new route builder
func NewRouteBuilder() *RouteBuilder {
	return &RouteBuilder{
		middleware: []func(http.Handler) http.Handler{},
	}
}

// WithMethod sets the HTTP method for the route
func (rb *RouteBuilder) WithMethod(method string) *RouteBuilder {
	rb.method = method
	return rb
}

// WithPath sets the path for the route
func (rb *RouteBuilder) WithPath(path string) *RouteBuilder {
	rb.path = path
	return rb
}

// WithHandler sets the handler for the route
func (rb *RouteBuilder) WithHandler(handler http.HandlerFunc) *RouteBuilder {
	rb.handler = handler
	return rb
}

// WithMiddleware adds middleware to the route
func (rb *RouteBuilder) WithMiddleware(middleware func(http.Handler) http.Handler) *RouteBuilder {
	rb.middleware = append(rb.middleware, middleware)
	return rb
}

// Build creates the route definition
func (rb *RouteBuilder) Build() RouteDefinition {
	return RouteDefinition{
		Method:     rb.method,
		Path:       rb.path,
		Handler:    rb.handler,
		Middleware: rb.middleware,
	}
}

// AdminRouteManager manages admin route registration with strategy pattern
type AdminRouteManager struct {
	strategies []RouteStrategy
	context    *RouteContext
}

// NewAdminRouteManager creates a new admin route manager
func NewAdminRouteManager(repo *repository.Repository) *AdminRouteManager {
	context := NewRouteContext(repo)
	return &AdminRouteManager{
		strategies: []RouteStrategy{
			&DocumentationRouteStrategy{},
			&AdminRouteStrategy{},
		},
		context: context,
	}
}

// RegisterRoutes registers all admin routes using the strategy pattern
func (arm *AdminRouteManager) RegisterRoutes(r chi.Router) error {
	for _, strategy := range arm.strategies {
		if err := strategy.Register(r, arm.context); err != nil {
			return err
		}
	}
	return nil
}

// AddStrategy adds a new route strategy
func (arm *AdminRouteManager) AddStrategy(strategy RouteStrategy) {
	arm.strategies = append(arm.strategies, strategy)
}
