# Database Backup Scripts

This directory contains scripts for backing up and restoring the PostgreSQL database.

## Prerequisites

- PostgreSQL client tools (`pg_dump`, `psql`) must be installed
- Environment variables must be set in `.env` or `.env.local`:
  - `DATABASE_URL` - Local database connection string
  - `REMOTE_DATABASE_URL` or `DATABASE_URL_PRODUCTION` - Remote database connection string

## Available Commands

### Backup Commands

```bash
# Backup local database
npm run db:backup:local

# Backup remote database
npm run db:backup:remote

# Sync remote database to local (backs up both, then restores remote to local)
npm run db:backup:sync

# List all backups
npm run db:backups
```

### Restore Commands

```bash
# Restore a specific backup (interactive - will show available backups)
npm run db:restore

# Restore to local database (default)
npm run db:restore ./backups/backup_file.sql.gz

# Restore to remote database (requires extra confirmation)
npm run db:restore ./backups/backup_file.sql.gz remote
```

### Direct Script Usage

You can also run the scripts directly:

```bash
# Backup operations
./scripts/backup-db.sh local
./scripts/backup-db.sh remote
./scripts/backup-db.sh sync

# Restore operations
./scripts/restore-db.sh <backup-file> [local|remote]

# List backups
./scripts/list-backups.sh [all|local|remote|recent]
```

## Backup Storage

All backups are stored in the `./backups/` directory with timestamps:

- Local backups: `local_YYYYMMDD_HHMMSS.sql.gz`
- Remote backups: `remote_YYYYMMDD_HHMMSS.sql.gz`

## Safety Features

1. **Automatic Backups**: The sync operation creates backups of both databases before syncing
2. **Confirmation Prompts**: Destructive operations require confirmation
3. **Extra Protection for Remote**: Restoring to remote requires typing "RESTORE REMOTE"
4. **Compressed Storage**: Backups are automatically compressed with gzip
5. **Timestamp Naming**: All backups include timestamps to prevent overwrites

## Common Use Cases

### Daily Local Development

```bash
# Start your day by syncing the remote database to local
npm run db:backup:sync
```

### Before Deploying Changes

```bash
# Backup remote database before deploying schema changes
npm run db:backup:remote
```

### Restore from Accident

```bash
# List recent backups
npm run db:backups

# Restore a specific backup
npm run db:restore ./backups/local_20240615_143022.sql.gz
```

## Environment Variables

You can set these in `.env.local` (git-ignored) for local overrides:

```bash
# Required for local operations
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Required for remote operations (one of these)
REMOTE_DATABASE_URL="postgresql://user:password@remote-host:5432/dbname"
DATABASE_URL_PRODUCTION="postgresql://user:password@remote-host:5432/dbname"
```

## Troubleshooting

### "pg_dump: command not found"

Install PostgreSQL client tools:

```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Arch Linux
sudo pacman -S postgresql
```

### "FATAL: password authentication failed"

Check that your database URLs are correct and include the password.

### Backup seems stuck

Large databases may take time. The scripts show progress. For very large databases, consider using `pg_dump` directly with custom options.
