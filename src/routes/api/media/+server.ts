import type { RequestHandler } from './$types'
import type { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	getPaginationParams,
	getPaginationMeta,
	checkAdminAuth
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/media - List all media with pagination and filters
export const GET: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const { page, limit } = getPaginationParams(event.url)
		const skip = (page - 1) * limit

		// Get filter parameters
		const mimeType = event.url.searchParams.get('mimeType')
		const unused = event.url.searchParams.get('unused') === 'true'
		const search = event.url.searchParams.get('search')
		const publishedFilter = event.url.searchParams.get('publishedFilter')
		const sort = event.url.searchParams.get('sort') || 'newest'
		const albumId = event.url.searchParams.get('albumId')

		// Build where clause
		const whereConditions: Prisma.MediaWhereInput[] = []

		// Handle mime type filtering
		if (mimeType && mimeType !== 'all') {
			switch (mimeType) {
				case 'image':
					// JPG, PNG images (excluding GIF which is in video)
					whereConditions.push({
						OR: [
							{ mimeType: { startsWith: 'image/jpeg' } },
							{ mimeType: { startsWith: 'image/jpg' } },
							{ mimeType: { startsWith: 'image/png' } },
							{ mimeType: { startsWith: 'image/webp' } }
						]
					})
					break
				case 'video':
					// MP4, MOV, GIF
					whereConditions.push({
						OR: [{ mimeType: { startsWith: 'video/' } }, { mimeType: { equals: 'image/gif' } }]
					})
					break
				case 'audio':
					// WAV, MP3, M4A
					whereConditions.push({
						mimeType: { startsWith: 'audio/' }
					})
					break
				case 'vector':
					// SVG
					whereConditions.push({
						mimeType: { equals: 'image/svg+xml' }
					})
					break
			}
		}

		if (unused) {
			whereConditions.push({ usedIn: { equals: [] } })
		}

		if (search) {
			whereConditions.push({ filename: { contains: search, mode: 'insensitive' } })
		}

		// Filter by album if specified
		if (albumId) {
			whereConditions.push({
				albums: {
					some: {
						albumId: parseInt(albumId)
					}
				}
			})
		}

		// Handle published filter
		if (publishedFilter && publishedFilter !== 'all') {
			switch (publishedFilter) {
				case 'unpublished':
					// Media that is not used anywhere and not marked as photography
					whereConditions.push({
						AND: [
							{ usedIn: { equals: [] } },
							{ isPhotography: false },
							{
								usage: {
									none: {}
								}
							},
							{
								albums: {
									none: {}
								}
							}
						]
					})
					break
				case 'photos':
					// Media marked as photography or used in albums
					whereConditions.push({
						OR: [
							{ isPhotography: true },
							{ usedIn: { array_contains: 'album' } },
							{
								albums: {
									some: {}
								}
							}
						]
					})
					break
				case 'universe':
					// Media used in blog posts or essays (check both usedIn and usage relation)
					whereConditions.push({
						OR: [
							{ usedIn: { array_contains: 'post' } },
							{ usedIn: { array_contains: 'essay' } },
							{
								usage: {
									some: {
										contentType: { in: ['post', 'essay'] }
									}
								}
							}
						]
					})
					break
			}
		}

		// Combine all conditions with AND
		const where =
			whereConditions.length > 0
				? whereConditions.length === 1
					? whereConditions[0]
					: { AND: whereConditions }
				: {}

		// Build orderBy clause based on sort parameter
		let orderBy: Prisma.MediaOrderByWithRelationInput = { createdAt: 'desc' } // default to newest

		switch (sort) {
			case 'oldest':
				orderBy = { createdAt: 'asc' }
				break
			case 'name-asc':
				orderBy = { filename: 'asc' }
				break
			case 'name-desc':
				orderBy = { filename: 'desc' }
				break
			case 'size-asc':
				orderBy = { size: 'asc' }
				break
			case 'size-desc':
				orderBy = { size: 'desc' }
				break
			case 'newest':
			default:
				orderBy = { createdAt: 'desc' }
				break
		}

		// Get total count
		const total = await prisma.media.count({ where })

		// Get media items
		const media = await prisma.media.findMany({
			where,
			orderBy,
			skip,
			take: limit,
			select: {
				id: true,
				filename: true,
				mimeType: true,
				size: true,
				url: true,
				thumbnailUrl: true,
				width: true,
				height: true,
				dominantColor: true,
				colors: true,
				aspectRatio: true,
				usedIn: true,
				isPhotography: true,
				createdAt: true,
				description: true,
				exifData: true
			}
		})

		const pagination = getPaginationMeta(total, page, limit)

		logger.info('Media list retrieved', { total, page, limit })

		return jsonResponse({
			media,
			pagination
		})
	} catch (error) {
		logger.error('Failed to retrieve media', error as Error)
		return errorResponse('Failed to retrieve media', 500)
	}
}
