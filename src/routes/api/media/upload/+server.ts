import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { uploadFile, isCloudinaryConfigured } from '$lib/server/cloudinary'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { dev } from '$app/environment'

export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	// Check if Cloudinary is configured (skip in dev mode)
	if (!dev && !isCloudinaryConfigured()) {
		return errorResponse('Media upload service not configured', 503)
	}

	try {
		const formData = await event.request.formData()
		const file = formData.get('file') as File
		const context = (formData.get('context') as string) || 'media'

		if (!file || !(file instanceof File)) {
			return errorResponse('No file provided', 400)
		}

		// Validate file type
		const allowedTypes = [
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/webp',
			'image/gif',
			'image/svg+xml'
		]
		if (!allowedTypes.includes(file.type)) {
			return errorResponse('Invalid file type. Allowed types: JPEG, PNG, WebP, GIF, SVG', 400)
		}

		// Validate file size (max 10MB)
		const maxSize = 10 * 1024 * 1024 // 10MB
		if (file.size > maxSize) {
			return errorResponse('File too large. Maximum size is 10MB', 400)
		}

		// Upload to Cloudinary
		const uploadResult = await uploadFile(file, context as 'media' | 'photos' | 'projects')

		if (!uploadResult.success) {
			return errorResponse(uploadResult.error || 'Upload failed', 500)
		}

		// Save to database
		const media = await prisma.media.create({
			data: {
				filename: file.name,
				mimeType: file.type,
				size: file.size,
				url: uploadResult.secureUrl!,
				thumbnailUrl: uploadResult.thumbnailUrl,
				width: uploadResult.width,
				height: uploadResult.height,
				usedIn: []
			}
		})

		logger.info('Media uploaded successfully', {
			id: media.id,
			filename: media.filename,
			size: media.size
		})

		return jsonResponse(
			{
				id: media.id,
				url: media.url,
				thumbnailUrl: media.thumbnailUrl,
				width: media.width,
				height: media.height,
				filename: media.filename,
				mimeType: media.mimeType,
				size: media.size
			},
			201
		)
	} catch (error) {
		logger.error('Media upload error', error as Error)
		return errorResponse('Failed to upload media', 500)
	}
}

// Handle preflight requests
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization'
		}
	})
}
