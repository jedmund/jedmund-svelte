/**
 * Tag Validation Utilities
 *
 * Server-side validation for tag names and operations.
 * All validation must happen server-side (client-side is advisory only).
 */

export const TAG_VALIDATION = {
	minLength: 2,
	maxLength: 50,
	dbMaxLength: 100, // Safety margin in database
	pattern: /^[a-zA-Z0-9\s-]+$/, // Letters, numbers, spaces, hyphens
	reservedWords: ['admin', 'api', 'new', 'edit', 'delete', 'create', 'update', 'tags', 'posts'],
	maxWords: 5 // Prevent essay-length tags
} as const

export interface ValidationResult {
	valid: boolean
	error?: string
}

/**
 * Validate a tag name according to business rules
 */
export function validateTagName(name: string): ValidationResult {
	const trimmed = name.trim()

	// Length check
	if (trimmed.length < TAG_VALIDATION.minLength) {
		return { valid: false, error: 'Tag name must be at least 2 characters' }
	}

	if (trimmed.length > TAG_VALIDATION.maxLength) {
		return { valid: false, error: 'Tag name must be at most 50 characters' }
	}

	// Character whitelist
	if (!TAG_VALIDATION.pattern.test(trimmed)) {
		return {
			valid: false,
			error: 'Tag name contains invalid characters. Only letters, numbers, spaces, and hyphens allowed.'
		}
	}

	// Word count
	const wordCount = trimmed.split(/\s+/).length
	if (wordCount > TAG_VALIDATION.maxWords) {
		return { valid: false, error: `Tag name cannot exceed ${TAG_VALIDATION.maxWords} words` }
	}

	// Reserved words
	const normalized = trimmed.toLowerCase()
	if (TAG_VALIDATION.reservedWords.includes(normalized)) {
		return { valid: false, error: 'This tag name is reserved and cannot be used' }
	}

	return { valid: true }
}

/**
 * Generate a URL-friendly slug from a tag name
 */
export function generateSlug(name: string): string {
	return (
		name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]+/g, '') // Remove invalid chars
			.replace(/\s+/g, '-') // Spaces to hyphens
			.replace(/-+/g, '-') // Collapse multiple hyphens
			.replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
	)
}
