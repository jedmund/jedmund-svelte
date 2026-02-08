/**
 * Zod Schemas for Tag API Validation
 *
 * All API inputs are validated and sanitized using these schemas.
 */

import { z } from 'zod'

/**
 * Sanitize a string by trimming and removing HTML tags
 * Since we enforce character whitelist in validation, this is a safety layer
 */
function sanitizeString(val: string): string {
	return val.trim().replace(/<[^>]*>/g, '')
}

/**
 * Sanitize description (plain text only for now)
 */
function sanitizeDescription(val: string): string {
	return val.trim().replace(/<[^>]*>/g, '')
}

/**
 * Schema for creating a new tag
 */
export const createTagSchema = z.object({
	name: z
		.string()
		.min(2, 'Tag name must be at least 2 characters')
		.max(50, 'Tag name must be at most 50 characters')
		.regex(/^[a-zA-Z0-9\s-]+$/, 'Tag name contains invalid characters')
		.transform(sanitizeString),
	description: z
		.string()
		.max(500, 'Description too long')
		.optional()
		.transform((val) => (val ? sanitizeDescription(val) : undefined))
})

/**
 * Schema for updating a tag
 */
export const updateTagSchema = z.object({
	name: z
		.string()
		.min(2)
		.max(50)
		.regex(/^[a-zA-Z0-9\s-]+$/)
		.transform(sanitizeString)
		.optional(),
	description: z
		.string()
		.max(500)
		.optional()
		.transform((val) => (val ? sanitizeDescription(val) : undefined))
})

/**
 * Schema for merging tags
 */
export const mergeTagsSchema = z.object({
	sourceTagIds: z.array(z.number()).min(1, 'Must provide at least one source tag'),
	targetTagId: z.number()
})

/**
 * Schema for bulk tag operations
 */
export const bulkTagSchema = z.object({
	postIds: z.array(z.number()).min(1, 'Must provide at least one post'),
	tagIds: z.array(z.number()).min(1, 'Must provide at least one tag'),
	operation: z.enum(['add', 'remove'])
})

export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type MergeTagsInput = z.infer<typeof mergeTagsSchema>
export type BulkTagInput = z.infer<typeof bulkTagSchema>
