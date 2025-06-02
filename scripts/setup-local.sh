#!/bin/bash

echo "🚀 Setting up local development environment..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   brew install postgresql@15"
    echo "   brew services start postgresql@15"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.local.example..."
    cp .env.local.example .env
    echo "✅ .env file created. Please update it with your local settings."
else
    echo "✅ .env file already exists"
fi

# Create database
echo "🗄️  Creating local database..."
createdb universe 2>/dev/null || echo "Database already exists"

# Run Prisma commands
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "📊 Running database migrations..."
npx prisma migrate dev --name initial_setup

echo "✨ Local setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL is running: brew services start postgresql@15"
echo "2. Update .env with your local PostgreSQL connection string"
echo "3. Run: npm run dev"
echo "4. Visit: http://localhost:5173/api/health"