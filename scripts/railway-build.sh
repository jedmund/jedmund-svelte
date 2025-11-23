#!/bin/bash

# Railway deployment script
echo "🚂 Starting Railway deployment..."

# Generate Prisma client first
echo "📦 Generating Prisma client..."
npx prisma generate

# Initialize database (runs migrations and seeds on first deploy only)
echo "🗄️ Initializing database..."
pnpm run db:init

# Build the application
echo "🏗️ Building application..."
pnpm run build

echo "✅ Deployment preparation complete!"