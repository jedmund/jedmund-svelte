#!/bin/bash

# List Database Backups Script
# Usage: ./scripts/list-backups.sh [all|local|remote|recent]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKUP_DIR="./backups"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "No backups directory found. Run a backup first."
    exit 1
fi

# Function to format file size
format_size() {
    local size=$1
    if [ $size -lt 1024 ]; then
        echo "${size}B"
    elif [ $size -lt 1048576 ]; then
        echo "$((size/1024))KB"
    elif [ $size -lt 1073741824 ]; then
        echo "$((size/1048576))MB"
    else
        echo "$((size/1073741824))GB"
    fi
}

# Function to list backups
list_backups() {
    local pattern=$1
    local title=$2
    
    echo -e "${GREEN}${title}${NC}"
    echo "----------------------------------------"
    
    local count=0
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            local formatted_size=$(format_size $size)
            local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1-2)
            
            # Extract type and timestamp from filename
            local type=$(echo $filename | cut -d'_' -f1)
            local timestamp=$(echo $filename | grep -oE '[0-9]{8}_[0-9]{6}')
            
            # Format timestamp
            if [ ! -z "$timestamp" ]; then
                local date_part=$(echo $timestamp | cut -d'_' -f1)
                local time_part=$(echo $timestamp | cut -d'_' -f2)
                local formatted_date="${date_part:0:4}-${date_part:4:2}-${date_part:6:2}"
                local formatted_time="${time_part:0:2}:${time_part:2:2}:${time_part:4:2}"
                local display_time="$formatted_date $formatted_time"
            else
                local display_time=$modified
            fi
            
            # Color code by type
            case $type in
                "local")
                    echo -e "${BLUE}$filename${NC}"
                    ;;
                "remote")
                    echo -e "${YELLOW}$filename${NC}"
                    ;;
                *)
                    echo "$filename"
                    ;;
            esac
            echo "  Size: $formatted_size | Created: $display_time"
            echo ""
            
            count=$((count + 1))
        fi
    done < <(ls -t $BACKUP_DIR/$pattern 2>/dev/null)
    
    if [ $count -eq 0 ]; then
        echo "No backups found"
    else
        echo "Total: $count backup(s)"
    fi
    echo ""
}

# Calculate total backup size
calculate_total_size() {
    local total=0
    for file in $BACKUP_DIR/*.sql.gz; do
        if [ -f "$file" ]; then
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            total=$((total + size))
        fi
    done
    echo $(format_size $total)
}

# Main logic
case "${1:-all}" in
    "all")
        list_backups "*.sql.gz" "All Backups"
        echo -e "${GREEN}Total backup size: $(calculate_total_size)${NC}"
        ;;
    "local")
        list_backups "local*.sql.gz" "Local Backups"
        ;;
    "remote")
        list_backups "remote*.sql.gz" "Remote Backups"
        ;;
    "recent")
        echo -e "${GREEN}Recent Backups (last 5)${NC}"
        echo "----------------------------------------"
        ls -lht $BACKUP_DIR/*.sql.gz 2>/dev/null | head -5 || echo "No backups found"
        ;;
    *)
        echo "Usage: $0 [all|local|remote|recent]"
        echo ""
        echo "Options:"
        echo "  all    - List all backups (default)"
        echo "  local  - List only local database backups"
        echo "  remote - List only remote database backups"
        echo "  recent - Show 5 most recent backups"
        exit 1
        ;;
esac

# Show legend
echo ""
echo "Legend:"
echo -e "  ${BLUE}Blue${NC} = Local database backup"
echo -e "  ${YELLOW}Yellow${NC} = Remote database backup"