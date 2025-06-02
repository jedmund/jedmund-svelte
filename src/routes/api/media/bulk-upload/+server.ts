import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { uploadFiles, isCloudinaryConfigured } from '$lib/server/cloudinary'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	// Check if Cloudinary is configured
	if (!isCloudinaryConfigured()) {
		return errorResponse('Media upload service not configured', 503)
	}

	try {
		const formData = await event.request.formData()
		const files = formData.getAll('files') as File[]
		const context = (formData.get('context') as string) || 'media'

		if (!files || files.length === 0) {
			return errorResponse('No files provided', 400)
		}

		// Validate all files
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
		const maxSize = 10 * 1024 * 1024 // 10MB per file
		const maxFiles = 50 // Maximum 50 files at once

		if (files.length > maxFiles) {
			return errorResponse(`Too many files. Maximum ${maxFiles} files allowed`, 400)
		}

		for (const file of files) {
			if (!(file instanceof File)) {
				return errorResponse('Invalid file format', 400)
			}

			if (!allowedTypes.includes(file.type)) {
				return errorResponse(
					`Invalid file type for ${file.name}. Allowed types: JPEG, PNG, WebP`,
					400
				)
			}

			if (file.size > maxSize) {
				return errorResponse(`File ${file.name} is too large. Maximum size is 10MB`, 400)
			}
		}

		logger.info(`Starting bulk upload of ${files.length} files`)

		// Upload all files to Cloudinary
		const uploadResults = await uploadFiles(files, context as 'media' | 'photos' | 'projects')

		// Process results and save to database
		const mediaRecords = []
		const errors = []

		for (let i = 0; i < uploadResults.length; i++) {
			const result = uploadResults[i]
			const file = files[i]

			if (result.success) {
				try {
					const media = await prisma.media.create({
						data: {
							filename: file.name,
							mimeType: file.type,
							size: file.size,
							url: result.secureUrl!,
							thumbnailUrl: result.thumbnailUrl,
							width: result.width,
							height: result.height,
							usedIn: []
						}
					})

					mediaRecords.push({
						id: media.id,
						url: media.url,
						thumbnailUrl: media.thumbnailUrl,
						width: media.width,
						height: media.height,
						filename: media.filename
					})
				} catch (dbError) {
					errors.push({
						filename: file.name,
						error: 'Failed to save to database'
					})
				}
			} else {
				errors.push({
					filename: file.name,
					error: result.error || 'Upload failed'
				})
			}
		}

		logger.info(`Bulk upload completed: ${mediaRecords.length} successful, ${errors.length} failed`)

		return jsonResponse(
			{
				success: mediaRecords.length,
				failed: errors.length,
				total: files.length,
				media: mediaRecords,
				errors: errors.length > 0 ? errors : undefined
			},
			201
		)
	} catch (error) {
		logger.error('Bulk upload error', error as Error)
		return errorResponse('Failed to upload files', 500)
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
