# Local Development Setup Guide

This guide will help you set up a local development environment for the CMS without needing external services.

## Prerequisites

- Node.js 18+ installed
- Homebrew (for macOS)

## Step 1: Install PostgreSQL

### On macOS:

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

### On Linux:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
```

## Step 2: Set Up Local Environment

1. **Run the setup script:**

   ```bash
   npm run setup:local
   ```

   This script will:

   - Check PostgreSQL installation
   - Create a `.env` file from `.env.local.example`
   - Create the database
   - Run migrations
   - Generate Prisma client

2. **If the script fails, manually create the database:**

   ```bash
   # Create database
   createdb jedmund_cms

   # Or using psql
   psql -c "CREATE DATABASE jedmund_cms;"
   ```

3. **Update your `.env` file:**

   ```env
   # Use your local PostgreSQL settings
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jedmund_cms?schema=public"

   # For local dev, leave Cloudinary empty (will use mock data)
   CLOUDINARY_CLOUD_NAME=""
   CLOUDINARY_API_KEY=""
   CLOUDINARY_API_SECRET=""

   # Simple admin password for local testing
   ADMIN_PASSWORD="localdev"
   ```

## Step 3: Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npm run db:migrate

# Seed with test data
npm run db:seed
```

## Step 4: Start Development Server

```bash
npm run dev
```

## Step 5: Test the Setup

1. **Check API health:**
   Visit http://localhost:5173/api/health

   You should see:

   ```json
   {
   	"status": "ok",
   	"services": {
   		"database": "connected",
   		"cloudinary": "not configured"
   	}
   }
   ```

2. **View database:**
   ```bash
   npm run db:studio
   ```
   This opens Prisma Studio at http://localhost:5555

## Testing API Endpoints

Since we need authentication, use these curl commands:

```bash
# Test health (no auth needed)
curl http://localhost:5173/api/health

# Test media list (with auth)
curl -H "Authorization: Basic $(echo -n 'admin:localdev' | base64)" \
  http://localhost:5173/api/media

# Test project creation
curl -X POST \
  -H "Authorization: Basic $(echo -n 'admin:localdev' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Project","year":2024,"slug":"test-project"}' \
  http://localhost:5173/api/projects
```

## Local Development Notes

1. **Media Uploads:** Without Cloudinary configured, uploaded images will return mock URLs. The files won't actually be stored anywhere, but the database records will be created for testing.

2. **Authentication:** Use Basic Auth with username `admin` and password `localdev` (or whatever you set in ADMIN_PASSWORD).

3. **Database:** All data is stored locally in PostgreSQL. You can reset it anytime with:

   ```bash
   npx prisma migrate reset
   ```

4. **Debugging:** Check the console for detailed logs. The logger will show all API requests and database queries in development mode.

## Troubleshooting

### PostgreSQL Connection Issues

- Make sure PostgreSQL is running: `brew services list`
- Check if the database exists: `psql -l`
- Try connecting manually: `psql -d jedmund_cms`

### Prisma Issues

- Clear Prisma generated files: `rm -rf node_modules/.prisma`
- Regenerate: `npx prisma generate`

### Port Already in Use

- Kill the process: `lsof -ti:5173 | xargs kill -9`
- Or use a different port: `npm run dev -- --port 5174`

## Next Steps

Once local development is working, you can:

1. Start building the admin UI (Phase 3)
2. Test CRUD operations with the API
3. Develop without needing external services

When ready for production, see the deployment guide for setting up Railway and Cloudinary.
