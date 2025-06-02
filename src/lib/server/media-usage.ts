import { prisma } from './database.js'

export interface MediaUsageReference {
	mediaId: number
	contentType: 'project' | 'post' | 'album'
	contentId: number
	fieldName: string
}

export interface MediaUsageDisplay {
	contentType: string
	contentId: number
	contentTitle: string
	fieldName: string
	fieldDisplayName: string
	contentUrl?: string
	createdAt: Date
}

/**
 * Track media usage for a piece of content
 */
export async function trackMediaUsage(references: MediaUsageReference[]) {
	if (references.length === 0) return

	// Use upsert to handle duplicates gracefully
	const operations = references.map((ref) =>
		prisma.mediaUsage.upsert({
			where: {
				mediaId_contentType_contentId_fieldName: {
					mediaId: ref.mediaId,
					contentType: ref.contentType,
					contentId: ref.contentId,
					fieldName: ref.fieldName
				}
			},
			update: {
				updatedAt: new Date()
			},
			create: {
				mediaId: ref.mediaId,
				contentType: ref.contentType,
				contentId: ref.contentId,
				fieldName: ref.fieldName
			}
		})
	)

	await prisma.$transaction(operations)
}

/**
 * Remove media usage tracking for a piece of content
 */
export async function removeMediaUsage(contentType: string, contentId: number, fieldName?: string) {
	await prisma.mediaUsage.deleteMany({
		where: {
			contentType,
			contentId,
			...(fieldName && { fieldName })
		}
	})
}

/**
 * Update media usage for a piece of content (removes old, adds new)
 */
export async function updateMediaUsage(
	contentType: 'project' | 'post' | 'album',
	contentId: number,
	fieldName: string,
	mediaIds: number[]
) {
	await prisma.$transaction(async (tx) => {
		// Remove existing usage for this field
		await tx.mediaUsage.deleteMany({
			where: {
				contentType,
				contentId,
				fieldName
			}
		})

		// Add new usage references
		if (mediaIds.length > 0) {
			await tx.mediaUsage.createMany({
				data: mediaIds.map((mediaId) => ({
					mediaId,
					contentType,
					contentId,
					fieldName
				}))
			})
		}
	})
}

/**
 * Get usage information for a specific media item
 */
export async function getMediaUsage(mediaId: number): Promise<MediaUsageDisplay[]> {
	const usage = await prisma.mediaUsage.findMany({
		where: { mediaId },
		orderBy: { createdAt: 'desc' }
	})

	const results: MediaUsageDisplay[] = []

	for (const record of usage) {
		let contentTitle = 'Unknown'
		let contentUrl = undefined

		// Fetch content details based on type
		try {
			switch (record.contentType) {
				case 'project': {
					const project = await prisma.project.findUnique({
						where: { id: record.contentId },
						select: { title: true, slug: true }
					})
					if (project) {
						contentTitle = project.title
						contentUrl = `/work/${project.slug}`
					}
					break
				}
				case 'post': {
					const post = await prisma.post.findUnique({
						where: { id: record.contentId },
						select: { title: true, slug: true, postType: true }
					})
					if (post) {
						contentTitle = post.title || `${post.postType} post`
						contentUrl = `/universe/${post.slug}`
					}
					break
				}
				case 'album': {
					const album = await prisma.album.findUnique({
						where: { id: record.contentId },
						select: { title: true, slug: true }
					})
					if (album) {
						contentTitle = album.title
						contentUrl = `/photos/${album.slug}`
					}
					break
				}
			}
		} catch (error) {
			console.error(`Error fetching ${record.contentType} ${record.contentId}:`, error)
		}

		results.push({
			contentType: record.contentType,
			contentId: record.contentId,
			contentTitle,
			fieldName: record.fieldName,
			fieldDisplayName: getFieldDisplayName(record.fieldName),
			contentUrl,
			createdAt: record.createdAt
		})
	}

	return results
}

/**
 * Get friendly field names for display
 */
function getFieldDisplayName(fieldName: string): string {
	const displayNames: Record<string, string> = {
		featuredImage: 'Featured Image',
		logoUrl: 'Logo',
		gallery: 'Gallery',
		content: 'Content',
		coverPhotoId: 'Cover Photo',
		photoId: 'Photo',
		attachments: 'Attachments'
	}

	return displayNames[fieldName] || fieldName
}

/**
 * Extract media IDs from various data structures
 */
export function extractMediaIds(data: any, fieldName: string): number[] {
	const value = data[fieldName]
	if (!value) return []

	switch (fieldName) {
		case 'gallery':
		case 'attachments':
			// Gallery/attachments are arrays of media objects with id property
			if (Array.isArray(value)) {
				return value
					.map((item) => (typeof item === 'object' ? item.id : parseInt(item)))
					.filter((id) => !isNaN(id))
			}
			return []

		case 'featuredImage':
		case 'logoUrl':
			// Single media URL - extract ID from URL or assume it's an ID
			if (typeof value === 'string') {
				// Try to extract ID from URL pattern (e.g., /api/media/123/...)
				const match = value.match(/\/api\/media\/(\d+)/)
				return match ? [parseInt(match[1])] : []
			} else if (typeof value === 'number') {
				return [value]
			}
			return []

		case 'content':
			// Extract from rich text content (Edra editor)
			return extractMediaFromRichText(value)

		default:
			return []
	}
}

/**
 * Extract media IDs from rich text content (TipTap/Edra JSON)
 */
function extractMediaFromRichText(content: any): number[] {
	if (!content || typeof content !== 'object') return []

	const mediaIds: number[] = []

	function traverse(node: any) {
		if (!node) return

		// Handle image nodes
		if (node.type === 'image' && node.attrs?.src) {
			const match = node.attrs.src.match(/\/api\/media\/(\d+)/)
			if (match) {
				mediaIds.push(parseInt(match[1]))
			}
		}

		// Handle gallery nodes
		if (node.type === 'gallery' && node.attrs?.images) {
			for (const image of node.attrs.images) {
				if (image.id) {
					mediaIds.push(image.id)
				}
			}
		}

		// Recursively traverse child nodes
		if (node.content) {
			for (const child of node.content) {
				traverse(child)
			}
		}
	}

	traverse(content)
	return [...new Set(mediaIds)] // Remove duplicates
}
