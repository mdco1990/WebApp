# TODO List

## WebApp Enhancement 
- [x] Replace "Records" by "Items".
- [x] Remove useless spanish words.
- [x] The steps Overview > Planning > Items > Analytics.
- [x] Use of sections Columns (one for penefits and the other one for expenses that should be sections opposite).
- [x] Use of rows and twos columns for data sections.
- [x] Items of "Manual Budget (Bank and Planned Deductions)" Not saved that gon when reload the page. Items could be positive benefits or expenses.
- [x] Manual Budget (Bank and Planned Deductions) default values (All items must be 0).
- [x] Review and enhance UI/UX based on PDF and Web Preview.
- [x] Improve project layout (Current structure follows Go standards well).
- [x] Fix add income/outcome Source bug.
- [x] Refactor and clean code.
- [x] Add lint and test jobs to the CI.
- [x] Add tests for Go and React (backend + frontend suites in place; expand coverage ongoing)

## Recent Major Enhancements (Completed)
- [x] **Header UI Refactoring**: Limited buttons to single line, merged logout/password/Admin Panel into dropdown
- [x] **User Management Page**: Created dedicated full-page user management interface with tabbed navigation
- [x] **DB Admin Enhancement**: Enhanced database administration page with dashboard and modern UI
- [x] **Secure API Integration**: Implemented comprehensive OWASP-compliant secure API endpoints
- [x] **Code Quality Improvements**: Reduced linting issues from 123 to 39 (backend) and 56 to 51 (frontend)
- [x] **Docker Environment**: Successfully established full Docker Compose development environment
## Future Enhancements

### Frontend Improvements
- [x] **Header UI Enhancement**: Refactored header to single-line layout with consolidated dropdown
- [x] **User Management Interface**: Created dedicated user management page with modern UI
- [x] **DB Admin Interface**: Enhanced database administration with dashboard and modern styling
- [x] **Code Quality**: Reduced frontend linting issues and improved code organization
- [x] **Responsive Design**: Improved responsive behavior and dropdown visibility
- [ ] Give unsaved rows a client UUID key to avoid index-key edge cases
- [ ] Add comprehensive unit tests for React components
- [ ] Consider pausing auto-reload while user is actively editing unsaved rows
- [ ] Add E2E tests using Playwright or Cypress
- [ ] Implement progressive web app (PWA) features

### Backend Improvements  
- [x] **API Rate Limiting**: Implemented rate limiting middleware for API protection
- [x] **Code Quality**: Comprehensive refactoring and cleaning of Go backend code
- [x] **Error Handling**: Improved error handling and logging throughout the application
- [x] **Security Middleware**: Enhanced security middleware with OWASP compliance
- [ ] Implement database connection pooling for MySQL
- [ ] Add API versioning strategy
- [ ] Implement audit logging for admin actions
- [ ] Add data export/import functionality

### DevOps & Infrastructure
- [x] **Docker Development Environment**: Established full Docker Compose environment with all services
- [x] **CI/CD Pipeline**: Enhanced GitHub Actions with comprehensive testing and linting
- [x] **Code Quality Tools**: Integrated golangci-lint, eslint, stylelint, and prettier
- [x] **Development Tooling**: Configured air for Go live reloading and development workflow
- [ ] Add Docker multi-stage builds for production
- [ ] Implement comprehensive monitoring and alerting
- [ ] Add automated security scanning in CI/CD
- [ ] Create Helm charts for Kubernetes deployment
- [ ] Add database backup automation

### Security Enhancements
- [x] **OWASP-Compliant Input Validation**: Implemented comprehensive input sanitization and validation middleware
- [x] **Content Security Policy (CSP)**: Implemented CSP headers and security headers (X-Frame-Options, X-XSS-Protection, etc.)
- [x] **Secure API Endpoints**: Created `/api/v1/secure/*` endpoints with enhanced validation and error handling
- [x] **Request Size Limiting**: Added protection against DoS attacks through large payloads
- [x] **Session Management**: Implemented proper session-based authentication with secure cookies
- [ ] Implement JWT-based authentication (future enhancement)
- [ ] Add OAuth2/OIDC integration (future enhancement)

## Current Priorities & Next Steps
- [x] **Fix Backend Test Failures**: Resolved `TestLoad` and `TestContainsSQLInjection` test failures
- [x] **Fix Frontend Test Failures**: Resolved `useManualBudget` and `ManualBudgetSection` test issues
- [ ] **Integration Testing**: Complete end-to-end testing of the full application stack
- [ ] **Performance Optimization**: Optimize database queries and frontend rendering
- [x] **Documentation**: Updated API documentation with secure endpoints and user guides
