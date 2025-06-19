#!/bin/bash

# Database Restore Script
# Usage: ./scripts/restore-db.sh <backup-file> [local|remote]

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

# Check arguments
if [ $# -lt 1 ]; then
    echo "Database Restore Utility"
    echo ""
    echo "Usage: $0 <backup-file> [local|remote]"
    echo ""
    echo "Arguments:"
    echo "  backup-file - Path to the backup file (.sql or .sql.gz)"
    echo "  target      - Target database: 'local' (default) or 'remote'"
    echo ""
    echo "Example:"
    echo "  $0 ./backups/local_20240101_120000.sql.gz"
    echo "  $0 ./backups/remote_20240101_120000.sql.gz local"
    echo ""
    echo "Recent backups:"
    ls -lht ./backups/*.sql.gz 2>/dev/null | head -10 || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1
TARGET=${2:-local}

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Function to parse database URL
parse_db_url() {
    local url=$1
    # postgresql://user:password@host:port/database
    # Remove the postgresql:// prefix
    local stripped=$(echo $url | sed 's|postgresql://||')
    
    # Extract user:password@host:port/database
    local user_pass=$(echo $stripped | cut -d@ -f1)
    local host_port_db=$(echo $stripped | cut -d@ -f2)
    
    # Extract user and password
    local db_user=$(echo $user_pass | cut -d: -f1)
    local db_password=$(echo $user_pass | cut -d: -f2)
    
    # Extract host, port, and database
    local host_port=$(echo $host_port_db | cut -d/ -f1)
    local db_name=$(echo $host_port_db | cut -d/ -f2 | cut -d? -f1)
    
    # Extract host and port
    local db_host=$(echo $host_port | cut -d: -f1)
    local db_port=$(echo $host_port | cut -d: -f2)
    
    echo "$db_host|$db_port|$db_name|$db_user|$db_password"
}

# Determine target database URL
if [ "$TARGET" = "local" ]; then
    TARGET_DB_URL=$DATABASE_URL
    TARGET_DESC="local"
elif [ "$TARGET" = "remote" ]; then
    TARGET_DB_URL=${REMOTE_DATABASE_URL:-$DATABASE_URL_PRODUCTION}
    TARGET_DESC="remote"
    if [ -z "$TARGET_DB_URL" ]; then
        echo -e "${RED}Error: REMOTE_DATABASE_URL or DATABASE_URL_PRODUCTION not set${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: Invalid target. Use 'local' or 'remote'${NC}"
    exit 1
fi

# Parse database URL
parsed_url=$(parse_db_url "$TARGET_DB_URL")
IFS='|' read -r db_host db_port db_name db_user db_password <<< "$parsed_url"

echo -e "${GREEN}Restoring to $TARGET_DESC database${NC}"
echo "Database: $db_name"
echo "Host: $db_host:$db_port"
echo "Backup file: $BACKUP_FILE"
echo ""

# Confirmation with stronger warning for remote
if [ "$TARGET" = "remote" ]; then
    echo -e "${RED}WARNING: You are about to restore to the REMOTE database!${NC}"
    echo -e "${RED}This will DELETE ALL DATA in the remote database and replace it.${NC}"
    echo -n "Type 'RESTORE REMOTE' to confirm: "
    read confirm
    if [ "$confirm" != "RESTORE REMOTE" ]; then
        echo "Restore cancelled"
        exit 1
    fi
else
    echo -e "${YELLOW}Warning: This will delete all data in the $TARGET_DESC database${NC}"
    echo -n "Are you sure you want to continue? (y/N): "
    read confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Restore cancelled"
        exit 1
    fi
fi

# Set PGPASSWORD to avoid password prompt
export PGPASSWORD=$db_password

# Drop existing connections
echo "Dropping existing connections..."
psql -h $db_host -p $db_port -U $db_user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db_name' AND pid <> pg_backend_pid();" 2>/dev/null || true

# Drop and recreate database
echo "Dropping database..."
psql -h $db_host -p $db_port -U $db_user -d postgres -c "DROP DATABASE IF EXISTS $db_name;"

echo "Creating database..."
psql -h $db_host -p $db_port -U $db_user -d postgres -c "CREATE DATABASE $db_name;"

# Handle compressed files
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "Decompressing backup..."
    TEMP_FILE=$(mktemp)
    gunzip -c $BACKUP_FILE > $TEMP_FILE
    RESTORE_FILE=$TEMP_FILE
else
    RESTORE_FILE=$BACKUP_FILE
fi

# Restore database
echo "Restoring database..."
psql -h $db_host -p $db_port -U $db_user -d $db_name -f $RESTORE_FILE

# Clean up temp file if created
if [ ! -z "$TEMP_FILE" ]; then
    rm $TEMP_FILE
fi

unset PGPASSWORD

# Run Prisma migrations if restoring to local
if [ "$TARGET" = "local" ]; then
    echo "Running Prisma migrations..."
    npm run db:deploy
fi

echo -e "${GREEN}✓ Database restored successfully${NC}"