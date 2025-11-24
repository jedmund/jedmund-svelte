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
	} catch (error: unknown) {
		// If the table doesn't exist, database is not initialized
		const message = error instanceof Error ? error.message : String(error)
		console.log('📊 Migration table check failed (expected on first deploy):', message)
		return false
	}
}

async function initializeDatabase() {
	console.log('🔍 Checking database initialization status...')

	// Give the database a moment to be ready
	await new Promise((resolve) => setTimeout(resolve, 2000))

	try {
		const isInitialized = await isDatabaseInitialized()

		if (!isInitialized) {
			console.log('📦 First time setup detected. Initializing database...')

			// Run migrations
			console.log('🔄 Running database migrations...')
			execSync('pnpm exec prisma migrate deploy', { stdio: 'inherit' })

			// Run seeds
			console.log('🌱 Seeding database...')
			execSync('pnpm exec prisma db seed', { stdio: 'inherit' })

			console.log('✅ Database initialization complete!')
		} else {
			console.log('✅ Database already initialized. Running migrations only...')
			execSync('pnpm exec prisma migrate deploy', { stdio: 'inherit' })
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
