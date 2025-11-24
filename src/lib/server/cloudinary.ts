import { v2 as cloudinary } from 'cloudinary'
import type { UploadApiResponse } from 'cloudinary'
import { logger } from './logger'
import { uploadFileLocally } from './local-storage'
import { dev } from '$app/environment'
import { selectBestDominantColor } from './color-utils'

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true
})

// Check if Cloudinary is configured
export function isCloudinaryConfigured(): boolean {
	return !!(
		process.env.CLOUDINARY_CLOUD_NAME &&
		process.env.CLOUDINARY_API_KEY &&
		process.env.CLOUDINARY_API_SECRET
	)
}

// Upload options for different asset types
const uploadPresets = {
	// For general media uploads (blog posts, project images)
	media: {
		folder: 'jedmund/media',
		resource_type: 'auto' as const,
		// Remove allowed_formats to avoid SVG validation issues
		transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }]
	},

	// For photo albums
	photos: {
		folder: 'jedmund/photos',
		resource_type: 'image' as const,
		allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
		transformation: [{ quality: 'auto:best' }, { fetch_format: 'auto' }]
	},

	// For project galleries
	projects: {
		folder: 'jedmund/projects',
		resource_type: 'image' as const,
		// Remove allowed_formats to avoid SVG validation issues
		transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }]
	}
}

// Image size variants (2025-appropriate sizes)
export const imageSizes = {
	thumbnail: { width: 1920, crop: 'scale' as const, quality: 'auto:good' as const }, // High-res thumbnails that maintain aspect ratio
	small: { width: 600, quality: 'auto:good' as const },
	medium: { width: 1200, quality: 'auto:good' as const },
	large: { width: 1920, quality: 'auto:good' as const },
	xlarge: { width: 2560, quality: 'auto:good' as const }
}

export interface UploadResult {
	success: boolean
	publicId?: string
	url?: string
	secureUrl?: string
	thumbnailUrl?: string
	width?: number
	height?: number
	format?: string
	size?: number
	dominantColor?: string
	colors?: Array<{ hex: string; rgb: [number, number, number]; population: number }>
	aspectRatio?: number
	duration?: number
	videoCodec?: string
	audioCodec?: string
	bitrate?: number
	error?: string
}

// Upload a single file
export async function uploadFile(
	file: File,
	type: 'media' | 'photos' | 'projects' = 'media',
	customOptions?: Record<string, unknown>
): Promise<UploadResult> {
	try {
		// Toggle this to use Cloudinary in development (requires API keys)
		const FORCE_CLOUDINARY_IN_DEV = false // Set to true to use Cloudinary in dev

		// Use local storage in development or when Cloudinary is not configured
		if ((dev && !FORCE_CLOUDINARY_IN_DEV) || !isCloudinaryConfigured()) {
			logger.info('Using local storage for file upload')
			const localResult = await uploadFileLocally(file, type)

			if (!localResult.success) {
				return {
					success: false,
					error: localResult.error || 'Local upload failed'
				}
			}

			const aspectRatio =
				localResult.width && localResult.height ? localResult.width / localResult.height : undefined

			return {
				success: true,
				publicId: `local/${localResult.filename}`,
				url: localResult.url,
				secureUrl: localResult.url,
				thumbnailUrl: localResult.thumbnailUrl,
				width: localResult.width,
				height: localResult.height,
				format: file.type.split('/')[1],
				size: localResult.size,
				aspectRatio,
				duration: localResult.duration,
				videoCodec: localResult.videoCodec,
				audioCodec: localResult.audioCodec,
				bitrate: localResult.bitrate
			}
		}

		// Convert File to buffer
		const arrayBuffer = await file.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		// Check if file is SVG for logging purposes
		const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')

		// Extract filename without extension
		const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')

		// Prepare upload options
		const uploadOptions = {
			...uploadPresets[type],
			...customOptions,
			public_id: `${Date.now()}-${fileNameWithoutExt}`,
			// For SVG files, explicitly set format to preserve extension
			...(isSvg && { format: 'svg' }),
			// Request color analysis for images
			colors: true
		}

		// Log upload attempt for debugging
		logger.info('Attempting file upload:', {
			filename: file.name,
			mimeType: file.type,
			size: file.size,
			isSvg,
			uploadOptions
		})

		// Upload to Cloudinary
		const result = await new Promise<UploadApiResponse>((resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
				if (error) reject(error)
				else if (result) resolve(result)
				else reject(new Error('Upload failed'))
			})

			uploadStream.end(buffer)
		})

		// Generate thumbnail URL - different approach for videos vs images
		const isVideo = file.type.startsWith('video/')
		const thumbnailUrl = isVideo 
			? cloudinary.url(result.public_id + '.jpg', {
				resource_type: 'video',
				transformation: [
					{ width: 1920, crop: 'scale', quality: 'auto:good' }, // 'scale' maintains aspect ratio
					{ start_offset: 'auto' } // Let Cloudinary pick the most interesting frame
				],
				secure: true
			})
			: cloudinary.url(result.public_id, {
				...imageSizes.thumbnail,
				secure: true
			})

		// Extract dominant color using smart selection
		let dominantColor: string | undefined
		if (result.colors && Array.isArray(result.colors) && result.colors.length > 0) {
			dominantColor = selectBestDominantColor(result.colors, {
				minPercentage: 2,
				preferVibrant: true,
				excludeGreys: false,
				preferBrighter: true
			})
		}

		// Calculate aspect ratio
		const aspectRatio = result.width && result.height ? result.width / result.height : undefined
		
		// Extract video metadata if present
		let duration: number | undefined
		let videoCodec: string | undefined
		let audioCodec: string | undefined
		let bitrate: number | undefined
		
		if (isVideo && result.duration) {
			duration = result.duration
			videoCodec = result.video?.codec
			audioCodec = result.audio?.codec
			bitrate = result.bit_rate
		}

		logger.mediaUpload(file.name, file.size, file.type, true)

		return {
			success: true,
			publicId: result.public_id,
			url: result.url,
			secureUrl: result.secure_url,
			thumbnailUrl,
			width: result.width,
			height: result.height,
			format: result.format,
			size: result.bytes,
			dominantColor,
			colors: result.colors,
			aspectRatio,
			duration,
			videoCodec,
			audioCodec,
			bitrate
		}
	} catch (error) {
		logger.error('Cloudinary upload failed', error as Error)
		logger.mediaUpload(file.name, file.size, file.type, false)

		// Enhanced error logging
		if (error instanceof Error) {
			logger.error('Upload error details:', {
				filename: file.name,
				mimeType: file.type,
				size: file.size,
				errorMessage: error.message,
				errorStack: error.stack
			})
		}

		return {
			success: false,
			error: error instanceof Error ? error.message : 'Upload failed'
		}
	}
}

// Upload multiple files
export async function uploadFiles(
	files: File[],
	type: 'media' | 'photos' | 'projects' = 'media'
): Promise<UploadResult[]> {
	const uploadPromises = files.map((file) => uploadFile(file, type))
	return Promise.all(uploadPromises)
}

// Delete a file from Cloudinary
export async function deleteFile(publicId: string): Promise<boolean> {
	try {
		if (!isCloudinaryConfigured()) {
			throw new Error('Cloudinary is not configured')
		}

		// Try to delete with auto resource type first
		const result = await cloudinary.uploader.destroy(publicId, {
			resource_type: 'auto'
		})

		return result.result === 'ok'
	} catch (error) {
		logger.error('Cloudinary delete failed', error as Error)
		return false
	}
}

// Generate optimized URL for an image
export function getOptimizedUrl(
	publicId: string,
	options?: {
		width?: number
		height?: number
		quality?: string
		format?: string
		crop?: string
	}
): string {
	return cloudinary.url(publicId, {
		secure: true,
		transformation: [
			{
				quality: options?.quality || 'auto:good',
				fetch_format: options?.format || 'auto',
				...(options?.width && { width: options.width }),
				...(options?.height && { height: options.height }),
				...(options?.crop && { crop: options.crop })
			}
		]
	})
}

// Get responsive image URLs for different screen sizes
export function getResponsiveUrls(publicId: string): Record<string, string> {
	return {
		thumbnail: getOptimizedUrl(publicId, imageSizes.thumbnail),
		small: getOptimizedUrl(publicId, { width: imageSizes.small.width }),
		medium: getOptimizedUrl(publicId, { width: imageSizes.medium.width }),
		large: getOptimizedUrl(publicId, { width: imageSizes.large.width }),
		xlarge: getOptimizedUrl(publicId, { width: imageSizes.xlarge.width }),
		original: cloudinary.url(publicId, { secure: true })
	}
}

// Smart image size selection based on container width
export function getSmartImageUrl(publicId: string, containerWidth: number, retina = true): string {
	// Account for retina displays
	const targetWidth = retina ? containerWidth * 2 : containerWidth

	// Select appropriate size
	if (targetWidth <= 600) {
		return getOptimizedUrl(publicId, { width: imageSizes.small.width })
	} else if (targetWidth <= 1200) {
		return getOptimizedUrl(publicId, { width: imageSizes.medium.width })
	} else if (targetWidth <= 1920) {
		return getOptimizedUrl(publicId, { width: imageSizes.large.width })
	} else {
		return getOptimizedUrl(publicId, { width: imageSizes.xlarge.width })
	}
}

// Extract public ID from Cloudinary URL
export function extractPublicId(url: string): string | null {
	try {
		// Cloudinary URLs typically follow this pattern:
		// https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
		// First decode the URL to handle encoded characters
		const decodedUrl = decodeURIComponent(url)
		const match = decodedUrl.match(/\/v\d+\/(.+)\.[a-zA-Z]+$/)
		if (match) {
			// Re-encode the public ID for Cloudinary API
			return match[1]
		}
		return null
	} catch {
		return null
	}
}
