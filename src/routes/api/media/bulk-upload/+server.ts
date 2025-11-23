import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { uploadFiles, isCloudinaryConfigured } from '$lib/server/cloudinary'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import exifr from 'exifr'

// Extract EXIF data from image file
async function extractExifData(file: File) {
	try {
		logger.info(`Starting EXIF extraction for ${file.name}`, {
			size: file.size,
			type: file.type
		})

		const buffer = await file.arrayBuffer()
		logger.info(`Buffer created for ${file.name}`, { bufferSize: buffer.byteLength })

		// Try parsing without pick first to see all available data
		const fullExif = await exifr.parse(buffer)
		logger.info(`Full EXIF data available for ${file.name}:`, {
			hasData: !!fullExif,
			availableFields: fullExif ? Object.keys(fullExif).slice(0, 10) : [] // First 10 fields
		})

		// Now parse with specific fields
		const exif = await exifr.parse(buffer, {
			pick: [
				'Make',
				'Model',
				'LensModel',
				'FocalLength',
				'FNumber',
				'ExposureTime',
				'ISO',
				'ISOSpeedRatings', // Alternative ISO field
				'DateTimeOriginal',
				'DateTime', // Alternative date field
				'GPSLatitude',
				'GPSLongitude',
				'Orientation',
				'ColorSpace'
			]
		})

		logger.info(`EXIF parse result for ${file.name}:`, {
			hasExif: !!exif,
			exifKeys: exif ? Object.keys(exif) : []
		})

		if (!exif) return null

		// Format EXIF data
		const formattedExif: ExifData = {}

		// Camera info
		if (exif.Make && exif.Model) {
			formattedExif.camera = `${exif.Make} ${exif.Model}`.replace(/\s+/g, ' ').trim()
		}

		// Lens info
		if (exif.LensModel) {
			formattedExif.lens = exif.LensModel
		}

		// Settings
		if (exif.FocalLength) {
			formattedExif.focalLength = `${exif.FocalLength}mm`
		}

		if (exif.FNumber) {
			formattedExif.aperture = `f/${exif.FNumber}`
		}

		if (exif.ExposureTime) {
			formattedExif.shutterSpeed =
				exif.ExposureTime < 1 ? `1/${Math.round(1 / exif.ExposureTime)}` : `${exif.ExposureTime}s`
		}

		if (exif.ISO) {
			formattedExif.iso = `ISO ${exif.ISO}`
		} else if (exif.ISOSpeedRatings) {
			// Handle alternative ISO field
			const iso = Array.isArray(exif.ISOSpeedRatings)
				? exif.ISOSpeedRatings[0]
				: exif.ISOSpeedRatings
			formattedExif.iso = `ISO ${iso}`
		}

		// Date taken
		if (exif.DateTimeOriginal) {
			formattedExif.dateTaken = exif.DateTimeOriginal
		} else if (exif.DateTime) {
			// Fallback to DateTime if DateTimeOriginal not available
			formattedExif.dateTaken = exif.DateTime
		}

		// GPS coordinates
		if (exif.GPSLatitude && exif.GPSLongitude) {
			formattedExif.coordinates = {
				latitude: exif.GPSLatitude,
				longitude: exif.GPSLongitude
			}
		}

		// Additional metadata
		if (exif.Orientation) {
			formattedExif.orientation =
				exif.Orientation === 1 ? 'Horizontal (normal)' : `Rotated (${exif.Orientation})`
		}

		if (exif.ColorSpace) {
			formattedExif.colorSpace = exif.ColorSpace
		}

		const result = Object.keys(formattedExif).length > 0 ? formattedExif : null
		logger.info(`Final EXIF result for ${file.name}:`, {
			hasData: !!result,
			fields: result ? Object.keys(result) : []
		})
		return result
	} catch (error) {
		logger.warn('Failed to extract EXIF data', {
			filename: file.name,
			error: error instanceof Error ? error.message : 'Unknown error'
		})
		return null
	}
}

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

		// Extract EXIF data before uploading (files might not be readable after upload)
		const exifDataMap = new Map()
		for (const file of files) {
			if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
				logger.info(`Pre-extracting EXIF data for ${file.name}`)
				const exifData = await extractExifData(file)
				if (exifData) {
					exifDataMap.set(file.name, exifData)
					logger.info(`EXIF data found for ${file.name}`)
				}
			}
		}

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
					// Get pre-extracted EXIF data
					const exifData = exifDataMap.get(file.name) || null

					const media = await prisma.media.create({
						data: {
							filename: file.name,
							originalName: file.name,
							mimeType: file.type,
							size: file.size,
							url: result.secureUrl!,
							thumbnailUrl: result.thumbnailUrl,
							width: result.width,
							height: result.height,
							exifData: exifData,
							usedIn: []
						}
					})

					mediaRecords.push({
						id: media.id,
						url: media.url,
						thumbnailUrl: media.thumbnailUrl,
						width: media.width,
						height: media.height,
						filename: media.filename,
						exifData: media.exifData
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
