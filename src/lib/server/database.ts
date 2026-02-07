import { PrismaClient } from '@prisma/client'
import { dev } from '$app/environment'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined
}

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: dev ? ['query', 'error', 'warn'] : ['error']
	})

if (dev) globalForPrisma.prisma = prisma

// Utility function to handle database errors
export function handleDatabaseError(error: unknown): Response {
	console.error('Database error:', error)

	if (error instanceof Error) {
		// Check for unique constraint violations
		if (error.message.includes('Unique constraint')) {
			return new Response(
				JSON.stringify({
					error: 'A record with this identifier already exists'
				}),
				{
					status: 409,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}

		// Check for foreign key violations
		if (error.message.includes('Foreign key constraint')) {
			return new Response(
				JSON.stringify({
					error: 'Related record not found'
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}
	}

	// Generic error response
	return new Response(
		JSON.stringify({
			error: 'An unexpected database error occurred'
		}),
		{
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		}
	)
}

// Utility to create slugs from titles
export function createSlug(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '') // Remove special characters
		.replace(/[\s_-]+/g, '-') // Replace spaces, underscores, hyphens with single hyphen
		.replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

// Ensure unique slug by appending number if needed
export async function ensureUniqueSlug(
	slug: string,
	model: 'project' | 'post' | 'album' | 'photo',
	excludeId?: number
): Promise<string> {
	let uniqueSlug = slug
	let counter = 1

	while (true) {
		const existingRecord = await (prisma[model] as any).findFirst({
			where: {
				slug: uniqueSlug,
				...(excludeId ? { NOT: { id: excludeId } } : {})
			}
		})

		if (!existingRecord) break

		uniqueSlug = `${slug}-${counter}`
		counter++
	}

	return uniqueSlug
}
