#!/bin/bash

# Database Migration Script
# This script handles database migrations for the web application

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-webapp}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
MIGRATIONS_DIR="migrations"
LOG_FILE="migration.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if psql is available
check_psql() {
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL client (psql) is not installed or not in PATH"
        exit 1
    fi
}

# Check if database exists
check_database() {
    log "Checking database connection..."
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        success "Database connection successful"
    else
        error "Cannot connect to database. Please check your configuration:"
        error "  DB_HOST: $DB_HOST"
        error "  DB_PORT: $DB_PORT"
        error "  DB_NAME: $DB_NAME"
        error "  DB_USER: $DB_USER"
        exit 1
    fi
}

# Create database if it doesn't exist
create_database() {
    log "Checking if database exists..."
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        success "Database '$DB_NAME' already exists"
    else
        log "Creating database '$DB_NAME'..."
        if PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"; then
            success "Database '$DB_NAME' created successfully"
        else
            error "Failed to create database '$DB_NAME'"
            exit 1
        fi
    fi
}

# Create migrations table if it doesn't exist
create_migrations_table() {
    log "Creating migrations table..."
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64) NOT NULL
);
EOF
    
    success "Migrations table created/verified"
}

# Calculate checksum of a file
calculate_checksum() {
    local file="$1"
    sha256sum "$file" | cut -d' ' -f1
}

# Check if migration has been applied
is_migration_applied() {
    local version="$1"
    local checksum="$2"
    
    local result=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version' AND checksum = '$checksum';")
    
    if [ "$result" -eq 1 ]; then
        return 0  # Migration is applied
    else
        return 1  # Migration is not applied
    fi
}

# Apply migration
apply_migration() {
    local file="$1"
    local version="$2"
    local name="$3"
    local checksum="$4"
    
    log "Applying migration: $name (version: $version)"
    
    # Check if migration has already been applied with same checksum
    if is_migration_applied "$version" "$checksum"; then
        warning "Migration $version ($name) already applied with same checksum, skipping"
        return 0
    fi
    
    # Check if migration has been applied with different checksum
    local existing_checksum=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT checksum FROM schema_migrations WHERE version = '$version';" | xargs)
    
    if [ -n "$existing_checksum" ] && [ "$existing_checksum" != "$checksum" ]; then
        error "Migration $version ($name) has been applied with different checksum:"
        error "  Expected: $checksum"
        error "  Found: $existing_checksum"
        error "  This indicates the migration file has been modified after being applied"
        exit 1
    fi
    
    # Apply the migration
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"; then
        # Record the migration
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
INSERT INTO schema_migrations (version, name, checksum) 
VALUES ('$version', '$name', '$checksum')
ON CONFLICT (version) DO UPDATE SET 
    name = EXCLUDED.name,
    checksum = EXCLUDED.checksum,
    applied_at = CURRENT_TIMESTAMP;
EOF
        
        success "Migration $version ($name) applied successfully"
    else
        error "Failed to apply migration $version ($name)"
        exit 1
    fi
}

# Run all pending migrations
run_migrations() {
    log "Running database migrations..."
    
    # Find all SQL files in migrations directory
    local migration_files=($(find "$MIGRATIONS_DIR" -name "*.sql" | sort))
    
    if [ ${#migration_files[@]} -eq 0 ]; then
        warning "No migration files found in $MIGRATIONS_DIR"
        return 0
    fi
    
    for file in "${migration_files[@]}"; do
        # Extract version and name from filename
        local filename=$(basename "$file")
        local version=$(echo "$filename" | cut -d'_' -f1)
        local name=$(echo "$filename" | cut -d'_' -f2- | sed 's/\.sql$//')
        local checksum=$(calculate_checksum "$file")
        
        apply_migration "$file" "$version" "$name" "$checksum"
    done
    
    success "All migrations completed successfully"
}

# Show migration status
show_status() {
    log "Migration status:"
    
    echo
    echo "Applied migrations:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version, name, applied_at FROM schema_migrations ORDER BY version;" 2>/dev/null || echo "No migrations table found"
    
    echo
    echo "Available migration files:"
    find "$MIGRATIONS_DIR" -name "*.sql" | sort | while read file; do
        local filename=$(basename "$file")
        local version=$(echo "$filename" | cut -d'_' -f1)
        local name=$(echo "$filename" | cut -d'_' -f2- | sed 's/\.sql$//')
        echo "  $version: $name"
    done
}

# Rollback last migration
rollback_last() {
    log "Rolling back last migration..."
    
    local last_migration=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version, name FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;" | xargs)
    
    if [ -z "$last_migration" ]; then
        warning "No migrations to rollback"
        return 0
    fi
    
    local version=$(echo "$last_migration" | cut -d'|' -f1 | xargs)
    local name=$(echo "$last_migration" | cut -d'|' -f2 | xargs)
    
    warning "This will rollback migration: $version ($name)"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Note: This is a simple rollback. In production, you might want more sophisticated rollback logic
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM schema_migrations WHERE version = '$version';"
        success "Rolled back migration $version ($name)"
    else
        log "Rollback cancelled"
    fi
}

# Reset database (DANGEROUS - drops all data)
reset_database() {
    warning "This will DROP ALL DATA in the database '$DB_NAME'"
    warning "This action cannot be undone!"
    read -p "Are you absolutely sure? Type 'YES' to confirm: " -r
    
    if [ "$REPLY" = "YES" ]; then
        log "Dropping database '$DB_NAME'..."
        PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" || true
        
        log "Creating fresh database '$DB_NAME'..."
        PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        
        success "Database reset completed"
    else
        log "Database reset cancelled"
    fi
}

# Show help
show_help() {
    echo "Database Migration Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  migrate     Run all pending migrations (default)"
    echo "  status      Show migration status"
    echo "  rollback    Rollback the last migration"
    echo "  reset       Reset database (DANGEROUS - drops all data)"
    echo "  help        Show this help message"
    echo
    echo "Environment variables:"
    echo "  DB_HOST     Database host (default: localhost)"
    echo "  DB_PORT     Database port (default: 5432)"
    echo "  DB_NAME     Database name (default: webapp)"
    echo "  DB_USER     Database user (default: postgres)"
    echo "  DB_PASSWORD Database password"
    echo
    echo "Examples:"
    echo "  $0 migrate"
    echo "  DB_HOST=prod.example.com DB_PASSWORD=secret $0 migrate"
    echo "  $0 status"
}

# Main script logic
main() {
    local command="${1:-migrate}"
    
    # Initialize log file
    echo "Migration log started at $(date)" > "$LOG_FILE"
    
    log "Starting database migration script"
    log "Command: $command"
    log "Database: $DB_NAME@$DB_HOST:$DB_PORT"
    
    # Check prerequisites
    check_psql
    
    case "$command" in
        "migrate")
            check_database
            create_migrations_table
            run_migrations
            ;;
        "status")
            check_database
            show_status
            ;;
        "rollback")
            check_database
            rollback_last
            ;;
        "reset")
            reset_database
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
    
    log "Migration script completed successfully"
}

# Run main function with all arguments
main "$@"