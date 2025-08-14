# Code Quality Guide

This document describes the comprehensive code quality system for WebApp, including how to review, lint, refactor, fix lint issues, clean code, test, and format both backend and frontend using Docker Compose.

## Overview

The WebApp project includes a comprehensive code quality system that ensures:
- **Review**: Static code analysis and review
- **Lint**: Code style and quality checks
- **Refactor**: Automatic code improvements
- **Fix Lint**: Auto-fix available linting issues
- **Clean Code**: Code formatting and organization
- **Test**: Unit tests for both backend and frontend
- **Format**: Consistent code formatting

## Quick Start

### Run All Quality Checks

```bash
# Using Makefile (recommended)
make quality-docker

# Using script directly
./scripts/quality-docker.sh
```

### Run Specific Quality Checks

```bash
# Backend only (Go)
make quality-docker-backend
# or
./scripts/quality-docker.sh --backend

# Frontend only (React/TypeScript)
make quality-docker-frontend
# or
./scripts/quality-docker.sh --frontend
```

## What Each Quality Check Does

### Backend Quality Checks (Go)

1. **Formatting**: Uses `goimports` to format code and manage imports
2. **Linting**: Uses `golangci-lint` with auto-fix for comprehensive static analysis
3. **Testing**: Runs all Go unit tests with verbose output
4. **Module Management**: Runs `go mod tidy` and `go mod verify`

### Frontend Quality Checks (React/TypeScript)

1. **Dependencies**: Installs npm dependencies with `npm ci`
2. **Formatting**: Uses Prettier to format code
3. **ESLint**: Runs ESLint with auto-fix for JavaScript/TypeScript
4. **Stylelint**: Runs Stylelint with auto-fix for CSS/SCSS
5. **Type Checking**: Runs TypeScript compiler checks
6. **Testing**: Runs Jest tests with coverage
7. **Build Verification**: Builds the project to verify everything works

## Docker Compose Integration

The quality checks run inside Docker containers to ensure:
- Consistent environment across different machines
- No need to install tools locally
- Isolated testing environment
- Reproducible results

### Services Used

- **api**: Backend Go service for quality checks
- **web**: Frontend React service for quality checks

## Available Commands

### Makefile Commands

```bash
# Comprehensive quality checks
make quality-docker

# Backend only
make quality-docker-backend

# Frontend only
make quality-docker-frontend

# Traditional local quality checks
make lint          # Go linting
make format        # Go formatting
make test          # Go tests
make lint-web      # Frontend linting
make format-web    # Frontend formatting
make test-web      # Frontend tests
```

### Script Commands

```bash
# All quality checks
./scripts/quality-docker.sh

# Backend only
./scripts/quality-docker.sh --backend

# Frontend only
./scripts/quality-docker.sh --frontend

# Help
./scripts/quality-docker.sh --help
```

## Configuration Files

### Backend Configuration

- **`.golangci.yml`**: golangci-lint configuration
- **`go.mod`**: Go module dependencies
- **`go.sum`**: Go module checksums

### Frontend Configuration

- **`web/package.json`**: npm dependencies and scripts
- **`web/eslint.config.ts`**: ESLint configuration
- **`web/stylelint.config.js`**: Stylelint configuration
- **`web/.prettierrc.json`**: Prettier configuration
- **`web/tsconfig.json`**: TypeScript configuration

### Docker Configuration

- **`deployments/docker-compose.yml`**: Docker Compose services
- **`deployments/Docker/Dockerfile.api`**: Backend Docker image
- **`deployments/Docker/Dockerfile.web`**: Frontend Docker image

## Quality Tools Used

### Backend Tools

- **goimports**: Code formatting and import management
- **golangci-lint**: Comprehensive Go linting
- **go test**: Unit testing
- **go mod**: Module management

### Frontend Tools

- **Prettier**: Code formatting
- **ESLint**: JavaScript/TypeScript linting
- **Stylelint**: CSS/SCSS linting
- **TypeScript**: Type checking
- **Jest**: Unit testing
- **Vite**: Build tool

## Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   # Start Docker
   sudo systemctl start docker
   ```

2. **Port conflicts**
   ```bash
   # Stop existing containers
   docker compose -f deployments/docker-compose.yml down
   ```

3. **Permission issues**
   ```bash
   # Make script executable
   chmod +x scripts/quality-docker.sh
   ```

4. **Network issues**
   ```bash
   # Clean Docker network
   docker network prune
   ```

### Debug Mode

To see detailed output, you can run the script with verbose logging:

```bash
# Enable debug output
set -x
./scripts/quality-docker.sh
set +x
```

## Integration with CI/CD

The quality checks can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Quality Checks
  run: |
    make quality-docker
```

## Best Practices

1. **Run quality checks before committing**
   ```bash
   make quality-docker
   ```

2. **Fix issues locally before pushing**
   - The scripts include auto-fix capabilities
   - Manual fixes may be needed for complex issues

3. **Keep dependencies updated**
   ```bash
   # Backend
   go mod tidy
   
   # Frontend
   cd web && npm update
   ```

4. **Regular quality checks**
   - Run quality checks daily during development
   - Include in pull request workflows
   - Monitor for new linting rules

## Performance

- **Backend checks**: ~30-60 seconds
- **Frontend checks**: ~60-120 seconds
- **Total time**: ~2-3 minutes

Times may vary based on:
- Machine performance
- Network speed (for tool downloads)
- Codebase size
- Number of issues found

## Contributing

When contributing to the quality system:

1. Test changes locally
2. Update documentation
3. Ensure backward compatibility
4. Add new tools to the appropriate section
5. Update configuration files as needed

## Support

For issues with the quality system:

1. Check the troubleshooting section
2. Review configuration files
3. Check Docker and Docker Compose versions
4. Ensure all dependencies are available
5. Create an issue with detailed error information
