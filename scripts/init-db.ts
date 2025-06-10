import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

async function isDatabaseInitialized(): Promise<boolean> {
  try {
    // Check if we have any completed migrations
    const migrationCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM _prisma_migrations 
      WHERE finished_at IS NOT NULL
    `
    
    return migrationCount[0].count > 0n
  } catch (error) {
    // If the table doesn't exist, database is not initialized
    return false
  }
}

async function initializeDatabase() {
  console.log('🔍 Checking database initialization status...')
  
  try {
    const isInitialized = await isDatabaseInitialized()
    
    if (!isInitialized) {
      console.log('📦 First time setup detected. Initializing database...')
      
      // Run migrations
      console.log('🔄 Running database migrations...')
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      
      // Run seeds
      console.log('🌱 Seeding database...')
      execSync('npx prisma db seed', { stdio: 'inherit' })
      
      console.log('✅ Database initialization complete!')
    } else {
      console.log('✅ Database already initialized. Running migrations only...')
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the initialization
initializeDatabase()