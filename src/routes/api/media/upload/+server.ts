import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { uploadFile, isCloudinaryConfigured } from '$lib/server/cloudinary'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { dev } from '$app/environment'
import exifr from 'exifr'

// Helper function to extract and format EXIF data
async function extractExifData(file: File): Promise<any> {
	try {
		const buffer = await file.arrayBuffer()
		const exif = await exifr.parse(buffer, {
			pick: [
				'Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 
				'ISO', 'DateTime', 'DateTimeOriginal', 'CreateDate', 'GPSLatitude', 
				'GPSLongitude', 'GPSAltitude', 'Orientation', 'ColorSpace'
			]
		})

		if (!exif) return null

		// Format the data into a more usable structure
		const formattedExif: any = {}

		if (exif.Make && exif.Model) {
			formattedExif.camera = `${exif.Make} ${exif.Model}`.trim()
		}

		if (exif.LensModel) {
			formattedExif.lens = exif.LensModel
		}

		if (exif.FocalLength) {
			formattedExif.focalLength = `${exif.FocalLength}mm`
		}

		if (exif.FNumber) {
			formattedExif.aperture = `f/${exif.FNumber}`
		}

		if (exif.ExposureTime) {
			if (exif.ExposureTime < 1) {
				formattedExif.shutterSpeed = `1/${Math.round(1 / exif.ExposureTime)}`
			} else {
				formattedExif.shutterSpeed = `${exif.ExposureTime}s`
			}
		}

		if (exif.ISO) {
			formattedExif.iso = `ISO ${exif.ISO}`
		}

		// Use the most reliable date field available
		const dateField = exif.DateTimeOriginal || exif.CreateDate || exif.DateTime
		if (dateField) {
			formattedExif.dateTaken = dateField.toISOString()
		}

		// GPS coordinates
		if (exif.GPSLatitude && exif.GPSLongitude) {
			formattedExif.coordinates = {
				latitude: exif.GPSLatitude,
				longitude: exif.GPSLongitude,
				altitude: exif.GPSAltitude || null
			}
		}

		// Additional metadata
		if (exif.Orientation) {
			formattedExif.orientation = exif.Orientation
		}

		if (exif.ColorSpace) {
			formattedExif.colorSpace = exif.ColorSpace
		}

		return Object.keys(formattedExif).length > 0 ? formattedExif : null
	} catch (error) {
		logger.warn('Failed to extract EXIF data', { error: error instanceof Error ? error.message : 'Unknown error' })
		return null
	}
}

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
		const altText = (formData.get('altText') as string) || null
		const description = (formData.get('description') as string) || null
		const isPhotography = formData.get('isPhotography') === 'true'

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

		// Extract EXIF data for image files (but don't block upload if it fails)
		let exifData = null
		if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
			exifData = await extractExifData(file)
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
				originalName: file.name,
				mimeType: file.type,
				size: file.size,
				url: uploadResult.secureUrl!,
				thumbnailUrl: uploadResult.thumbnailUrl,
				width: uploadResult.width,
				height: uploadResult.height,
				exifData: exifData,
				altText: altText?.trim() || null,
				description: description?.trim() || null,
				isPhotography: isPhotography,
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
				originalName: media.originalName,
				mimeType: media.mimeType,
				size: media.size,
				altText: media.altText,
				description: media.description,
				createdAt: media.createdAt,
				updatedAt: media.updatedAt
			},
			201
		)
	} catch (error) {
		logger.error('Media upload error', error as Error)
		console.error('Detailed upload error:', error)
		return errorResponse(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
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
