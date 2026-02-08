/**
 * Tag Database Operations
 *
 * Core CRUD operations for tags with proper validation and error handling.
 */

import { prisma } from '$lib/server/database'
import { generateSlug, validateTagName } from './validation'
import type { CreateTagInput, UpdateTagInput } from './schemas'

/**
 * Generate a unique slug, handling conflicts by appending a counter
 */
export async function generateUniqueSlug(name: string): Promise<string> {
	const baseSlug = generateSlug(name)
	let slug = baseSlug
	let counter = 2

	// Check for conflicts and append counter if needed
	while (await prisma.tag.findUnique({ where: { slug } })) {
		slug = `${baseSlug}-${counter}`
		counter++
	}

	return slug
}

/**
 * Create a new tag
 *
 * @throws Error if tag name already exists or is invalid
 */
export async function createTag(input: CreateTagInput) {
	const { name, description } = input

	// Validate tag name
	const validation = validateTagName(name)
	if (!validation.valid) {
		throw new Error(validation.error)
	}

	const normalized = name.toLowerCase().trim()

	// Check for existing tag (case-insensitive)
	const existing = await prisma.tag.findFirst({
		where: { name: { equals: normalized, mode: 'insensitive' } }
	})

	if (existing) {
		throw new Error('A tag with this name already exists')
	}

	// Generate unique slug
	const slug = await generateUniqueSlug(name)

	// Create tag
	return await prisma.tag.create({
		data: {
			name: normalized,
			displayName: name.trim(), // Preserve original casing
			slug,
			description: description?.trim()
		}
	})
}

/**
 * Update an existing tag
 *
 * @throws Error if tag not found or new name already exists
 */
export async function updateTag(tagId: number, input: UpdateTagInput) {
	const updates: any = {}

	// If updating name, validate and regenerate slug
	if (input.name) {
		const validation = validateTagName(input.name)
		if (!validation.valid) {
			throw new Error(validation.error)
		}

		const normalized = input.name.toLowerCase().trim()

		// Check if another tag already has this name
		const existing = await prisma.tag.findFirst({
			where: {
				name: { equals: normalized, mode: 'insensitive' },
				NOT: { id: tagId }
			}
		})

		if (existing) {
			throw new Error('A tag with this name already exists')
		}

		const slug = await generateUniqueSlug(input.name)

		updates.name = normalized
		updates.displayName = input.name.trim()
		updates.slug = slug
	}

	// Update description if provided
	if (input.description !== undefined) {
		updates.description = input.description?.trim() || null
	}

	// Perform update
	return await prisma.tag.update({
		where: { id: tagId },
		data: updates
	})
}

/**
 * Delete a tag
 *
 * Cascades to remove all post-tag relationships.
 */
export async function deleteTag(tagId: number) {
	return await prisma.tag.delete({
		where: { id: tagId }
	})
}

/**
 * Get tag by ID
 */
export async function getTagById(tagId: number) {
	return await prisma.tag.findUnique({
		where: { id: tagId },
		include: {
			_count: {
				select: { posts: true }
			}
		}
	})
}

/**
 * Get tag by slug
 */
export async function getTagBySlug(slug: string) {
	return await prisma.tag.findUnique({
		where: { slug },
		include: {
			_count: {
				select: { posts: true }
			}
		}
	})
}

/**
 * List all tags with optional search and pagination
 */
export async function listTags(params: {
	page?: number
	limit?: number
	sort?: 'name' | 'usage' | 'recent'
	order?: 'asc' | 'desc'
	search?: string
}) {
	const { page = 1, limit = 50, sort = 'name', order = 'asc', search } = params

	const where = search
		? {
				OR: [
					{ name: { contains: search, mode: 'insensitive' as const } },
					{ description: { contains: search, mode: 'insensitive' as const } }
				]
			}
		: {}

	const orderBy =
		sort === 'usage' ? { posts: { _count: order } } : sort === 'recent' ? { createdAt: order } : { [sort]: order }

	const [tags, total] = await Promise.all([
		prisma.tag.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy,
			include: {
				_count: {
					select: { posts: true }
				}
			}
		}),
		prisma.tag.count({ where })
	])

	return {
		tags: tags.map((tag) => ({
			id: tag.id,
			name: tag.name,
			displayName: tag.displayName,
			slug: tag.slug,
			description: tag.description,
			usageCount: tag._count.posts,
			createdAt: tag.createdAt.toISOString(),
			updatedAt: tag.updatedAt.toISOString()
		})),
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
			hasNext: page * limit < total,
			hasPrev: page > 1
		}
	}
}

/**
 * Get tag suggestions for typeahead
 */
export async function suggestTags(query: string, limit: number = 5) {
	if (query.length < 2) {
		return []
	}

	const tags = await prisma.tag.findMany({
		where: {
			name: {
				contains: query,
				mode: 'insensitive'
			}
		},
		take: limit,
		orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
		include: {
			_count: {
				select: { posts: true }
			}
		}
	})

	return tags.map((tag) => ({
		id: tag.id,
		name: tag.name,
		displayName: tag.displayName,
		slug: tag.slug,
		usageCount: tag._count.posts
	}))
}
