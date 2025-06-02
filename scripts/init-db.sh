#!/bin/bash

# Database initialization script
# This script checks if the database has been initialized and runs migrations/seeds only if needed

echo "🔍 Checking database initialization status..."

# Run a simple query to check if the _prisma_migrations table exists and has entries
DB_INITIALIZED=$(npx prisma db execute --stdin <<EOF 2>/dev/null | grep -c "1"
SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL LIMIT 1;
EOF
)

if [ "$DB_INITIALIZED" = "0" ]; then
    echo "📦 First time setup detected. Initializing database..."
    
    # Run migrations
    echo "🔄 Running database migrations..."
    npx prisma migrate deploy
    
    # Run seeds
    echo "🌱 Seeding database..."
    npx prisma db seed
    
    echo "✅ Database initialization complete!"
else
    echo "✅ Database already initialized. Running migrations only..."
    npx prisma migrate deploy
fi