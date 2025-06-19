#!/bin/bash

# Database Backup Script
# Usage: ./scripts/backup-db.sh [local|remote|sync]
#   local  - Backup local database
#   remote - Backup remote database
#   sync   - Copy remote database to local

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

if [ -f ".env.local" ]; then
    set -a
    source .env.local
    set +a
fi

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL is not set${NC}"
    exit 1
fi

# Parse DATABASE_URL for local database
# Format: postgresql://user:password@host:port/database
LOCAL_DB_URL=$DATABASE_URL
LOCAL_DB_NAME=$(echo $LOCAL_DB_URL | sed -E 's/.*\/([^?]+).*/\1/')
LOCAL_DB_USER=$(echo $LOCAL_DB_URL | sed -E 's/postgresql:\/\/([^:]+):.*/\1/')
LOCAL_DB_HOST=$(echo $LOCAL_DB_URL | sed -E 's/.*@([^:]+):.*/\1/')
LOCAL_DB_PORT=$(echo $LOCAL_DB_URL | sed -E 's/.*:([0-9]+)\/.*/\1/')

# Remote database URL (can be set as REMOTE_DATABASE_URL or passed as env var)
REMOTE_DB_URL=${REMOTE_DATABASE_URL:-$DATABASE_URL_PRODUCTION}

if [ -z "$REMOTE_DB_URL" ] && [ "$1" != "local" ]; then
    echo -e "${YELLOW}Warning: REMOTE_DATABASE_URL or DATABASE_URL_PRODUCTION not set${NC}"
    echo "For remote operations, set one of these environment variables or pass it:"
    echo "REMOTE_DATABASE_URL='postgresql://...' ./scripts/backup-db.sh remote"
fi

# Create backups directory if it doesn't exist
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Generate timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Function to parse database URL
parse_db_url() {
    local url=$1
    # Debug: Show input URL
    >&2 echo "Debug - Input URL: $url"
    
    # postgresql://user:password@host:port/database
    # Remove the postgresql:// prefix
    local stripped=$(echo $url | sed 's|postgresql://||')
    >&2 echo "Debug - Stripped: $stripped"
    
    # Extract user:password@host:port/database
    local user_pass=$(echo $stripped | cut -d@ -f1)
    local host_port_db=$(echo $stripped | cut -d@ -f2)
    >&2 echo "Debug - User/Pass: $user_pass"
    >&2 echo "Debug - Host/Port/DB: $host_port_db"
    
    # Extract user and password
    local db_user=$(echo $user_pass | cut -d: -f1)
    local db_password=$(echo $user_pass | cut -d: -f2)
    
    # Extract host, port, and database
    local host_port=$(echo $host_port_db | cut -d/ -f1)
    local db_name=$(echo $host_port_db | cut -d/ -f2 | cut -d? -f1)
    
    # Extract host and port
    local db_host=$(echo $host_port | cut -d: -f1)
    local db_port=$(echo $host_port | cut -d: -f2)
    
    >&2 echo "Debug - Final parsed: host=$db_host, port=$db_port, db=$db_name, user=$db_user"
    
    echo "$db_host|$db_port|$db_name|$db_user|$db_password"
}

# Function to backup database
backup_database() {
    local db_url=$1
    local backup_name=$2
    local description=$3
    
    echo -e "${GREEN}Starting backup: $description${NC}"
    
    # Parse database URL
    local parsed_url=$(parse_db_url "$db_url")
    IFS='|' read -r db_host db_port db_name db_user db_password <<< "$parsed_url"
    
    # Create backup filename
    local backup_file="${BACKUP_DIR}/${backup_name}_${TIMESTAMP}.sql"
    
    # Set PGPASSWORD to avoid password prompt
    export PGPASSWORD=$db_password
    
    # Debug: Show parsed values
    echo "Debug - Parsed values:"
    echo "  Host: '$db_host'"
    echo "  Port: '$db_port'"
    echo "  Database: '$db_name'"
    echo "  User: '$db_user'"
    
    # Run pg_dump
    echo "Backing up database: $db_name from $db_host:$db_port"
    pg_dump -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -f "$backup_file" --verbose --no-owner --no-acl
    
    # Compress the backup
    echo "Compressing backup..."
    gzip $backup_file
    
    unset PGPASSWORD
    
    echo -e "${GREEN}Backup completed: ${backup_file}.gz${NC}"
    echo "Size: $(ls -lh ${backup_file}.gz | awk '{print $5}')"
}

# Function to restore database
restore_database() {
    local backup_file=$1
    local target_db_url=$2
    local description=$3
    
    echo -e "${GREEN}Starting restore: $description${NC}"
    
    # Parse database URL
    local parsed_url=$(parse_db_url "$target_db_url")
    IFS='|' read -r db_host db_port db_name db_user db_password <<< "$parsed_url"
    
    # Set PGPASSWORD to avoid password prompt
    export PGPASSWORD=$db_password
    
    # Drop and recreate database
    echo -e "${YELLOW}Warning: This will drop and recreate the database: $db_name${NC}"
    echo -n "Are you sure you want to continue? (y/N): "
    read confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Restore cancelled"
        return
    fi
    
    # Drop existing connections
    echo "Dropping existing connections..."
    psql -h $db_host -p $db_port -U $db_user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db_name' AND pid <> pg_backend_pid();" 2>/dev/null || true
    
    # Drop and recreate database
    echo "Dropping database..."
    psql -h $db_host -p $db_port -U $db_user -d postgres -c "DROP DATABASE IF EXISTS $db_name;"
    
    echo "Creating database..."
    psql -h $db_host -p $db_port -U $db_user -d postgres -c "CREATE DATABASE $db_name;"
    
    # Decompress if needed
    if [[ $backup_file == *.gz ]]; then
        echo "Decompressing backup..."
        gunzip -c $backup_file > ${backup_file%.gz}
        backup_file=${backup_file%.gz}
        temp_file=true
    fi
    
    # Restore database
    echo "Restoring database..."
    psql -h $db_host -p $db_port -U $db_user -d $db_name -f $backup_file
    
    # Clean up temp file
    if [ "$temp_file" = true ]; then
        rm $backup_file
    fi
    
    unset PGPASSWORD
    
    # Run Prisma migrations to ensure schema is up to date
    echo "Running Prisma migrations..."
    npm run db:deploy
    
    echo -e "${GREEN}Restore completed${NC}"
}

# Function to sync remote to local
sync_remote_to_local() {
    if [ -z "$REMOTE_DB_URL" ]; then
        echo -e "${RED}Error: REMOTE_DATABASE_URL is not set${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Syncing remote database to local${NC}"
    
    # First, backup the local database
    echo "Creating backup of local database first..."
    backup_database "$LOCAL_DB_URL" "local_before_sync" "Local database (before sync)"
    
    # Backup remote database
    backup_database "$REMOTE_DB_URL" "remote_for_sync" "Remote database"
    
    # Find the latest remote backup
    latest_remote_backup=$(ls -t ${BACKUP_DIR}/remote_for_sync_*.sql.gz | head -1)
    
    # Restore remote backup to local
    restore_database "$latest_remote_backup" "$LOCAL_DB_URL" "Remote database to local"
}

# Main script logic
case "$1" in
    "local")
        backup_database "$LOCAL_DB_URL" "local" "Local database"
        ;;
    "remote")
        if [ -z "$REMOTE_DB_URL" ]; then
            echo -e "${RED}Error: REMOTE_DATABASE_URL is not set${NC}"
            exit 1
        fi
        backup_database "$REMOTE_DB_URL" "remote" "Remote database"
        ;;
    "sync")
        sync_remote_to_local
        ;;
    *)
        echo "Database Backup Utility"
        echo ""
        echo "Usage: $0 [local|remote|sync]"
        echo ""
        echo "Commands:"
        echo "  local  - Backup local database"
        echo "  remote - Backup remote database"
        echo "  sync   - Copy remote database to local (backs up both first)"
        echo ""
        echo "Environment variables:"
        echo "  DATABASE_URL              - Local database connection URL (required)"
        echo "  REMOTE_DATABASE_URL       - Remote database connection URL"
        echo "  DATABASE_URL_PRODUCTION   - Alternative remote database URL"
        echo ""
        echo "Backups are stored in: ./backups/"
        exit 1
        ;;
esac

# List recent backups
echo ""
echo "Recent backups:"
ls -lht $BACKUP_DIR/*.sql.gz 2>/dev/null | head -5 || echo "No backups found"