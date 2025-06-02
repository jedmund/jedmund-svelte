#!/bin/bash

# Railway deployment script
echo "🚂 Starting Railway deployment..."

# Initialize database (runs migrations and seeds on first deploy only)
echo "🗄️ Initializing database..."
npm run db:init

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Deployment preparation complete!"