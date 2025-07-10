# jedmund.com

Personal portfolio website built with SvelteKit featuring a content management system for showcasing creative work, writing, and personal interests.

## Features

- Content management system for organizing and displaying various types of media
- Photo galleries with masonry layout and infinite scrolling
- Blog/journal section for long-form writing
- Music listening history integration via Last.fm API
- Gaming activity tracking from Steam and PlayStation
- Project showcase pages with detailed case studies
- Responsive design with customizable themes

## Tech Stack

- SvelteKit with Svelte 5 (Runes mode)
- Redis for caching external API responses
- SCSS for styling
- Integration with Last.fm, Steam, PSN, iTunes, and Giant Bomb APIs

## Development

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Environment Variables

Required environment variables:

- `LASTFM_API_KEY` - Last.fm API key for music data
- `REDIS_URL` - Redis connection URL for caching

Optional environment variables:

- `DEBUG` - Enable debug logging for specific categories (e.g., `DEBUG=music` for music-related logs)

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type check with svelte-check
- `npm run lint` - Check formatting and linting
- `npm run format` - Auto-format code with prettier

## Database Management

### Quick Start

Sync remote production database to local development:

```bash
# This backs up both databases first, then copies remote to local
npm run db:backup:sync
```

### Prerequisites

1. PostgreSQL client tools must be installed (`pg_dump`, `psql`)

   ```bash
   # macOS
   brew install postgresql

   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

2. Set environment variables in `.env` or `.env.local`:

   ```bash
   # Required for local database operations
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

   # Required for remote database operations (use one of these)
   REMOTE_DATABASE_URL="postgresql://user:password@remote-host:5432/dbname"
   DATABASE_URL_PRODUCTION="postgresql://user:password@remote-host:5432/dbname"
   ```

### Backup Commands

```bash
# Backup local database
npm run db:backup:local

# Backup remote database
npm run db:backup:remote

# Sync remote to local (recommended for daily development)
npm run db:backup:sync

# List all backups
npm run db:backups
```

### Restore Commands

```bash
# Restore a backup to local database (interactive)
npm run db:restore

# Restore specific backup to local
npm run db:restore ./backups/backup_file.sql.gz

# Restore to remote (requires typing "RESTORE REMOTE" for safety)
npm run db:restore ./backups/backup_file.sql.gz remote
```

### Common Workflows

#### Daily Development

Start your day by syncing the production database to local:

```bash
npm run db:backup:sync
```

#### Before Deploying Schema Changes

Always backup the remote database:

```bash
npm run db:backup:remote
```

#### Recover from Mistakes

```bash
# See available backups
npm run db:backups

# Restore a specific backup
npm run db:restore ./backups/local_20240615_143022.sql.gz
```

### Backup Storage

All backups are stored in `./backups/` with timestamps:

- Local: `local_YYYYMMDD_HHMMSS.sql.gz`
- Remote: `remote_YYYYMMDD_HHMMSS.sql.gz`

### Safety Features

1. **Automatic backups** before sync operations
2. **Confirmation prompts** for all destructive operations
3. **Extra protection** for remote restore (requires typing full phrase)
4. **Compressed storage** with gzip
5. **Timestamped filenames** prevent overwrites
6. **Automatic migrations** after local restore
