import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import { logger } from './logger'

// Base directory for local uploads
const UPLOAD_DIR = 'static/local-uploads'
const PUBLIC_PATH = '/local-uploads'

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
	const dirs = [
		UPLOAD_DIR,
		path.join(UPLOAD_DIR, 'media'),
		path.join(UPLOAD_DIR, 'photos'),
		path.join(UPLOAD_DIR, 'projects'),
		path.join(UPLOAD_DIR, 'thumbnails')
	]

	for (const dir of dirs) {
		if (!existsSync(dir)) {
			await mkdir(dir, { recursive: true })
		}
	}
}

// Generate unique filename
function generateFilename(originalName: string): string {
	const timestamp = Date.now()
	const random = Math.random().toString(36).substring(2, 8)
	const ext = path.extname(originalName)
	const name = path.basename(originalName, ext)
	// Sanitize filename
	const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
	return `${timestamp}-${random}-${safeName}${ext}`
}

export interface LocalUploadResult {
	success: boolean
	filename?: string
	url?: string
	thumbnailUrl?: string
	width?: number
	height?: number
	size?: number
	duration?: number
	videoCodec?: string
	audioCodec?: string
	bitrate?: number
	error?: string
}

// Upload file locally (for development/testing)
export async function uploadFileLocally(
	file: File,
	type: 'media' | 'photos' | 'projects' = 'media'
): Promise<LocalUploadResult> {
	try {
		await ensureUploadDir()

		// Generate unique filename
		const filename = generateFilename(file.name)
		const filepath = path.join(UPLOAD_DIR, type, filename)
		const thumbnailFilename = `thumb-${filename.replace(path.extname(filename), '')}.jpg`
		const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', thumbnailFilename)

		// Convert File to buffer
		const arrayBuffer = await file.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		// Check if file is a video
		const isVideo = file.type.startsWith('video/')

		// Process dimensions and create thumbnail
		let width = 0
		let height = 0
		let duration: number | undefined
		let videoCodec: string | undefined
		let audioCodec: string | undefined
		let bitrate: number | undefined

		if (isVideo) {
			// Save video file first
			await writeFile(filepath, buffer)

			// Get video metadata and generate thumbnail
			await new Promise<void>((resolve, reject) => {
				ffmpeg.ffprobe(filepath, (err, metadata) => {
					if (err) {
						logger.error('Failed to probe video file', err)
						reject(err)
						return
					}

					// Extract video metadata
					const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
					const audioStream = metadata.streams.find((s) => s.codec_type === 'audio')

					if (videoStream) {
						width = videoStream.width || 0
						height = videoStream.height || 0
						videoCodec = videoStream.codec_name
					}

					if (audioStream) {
						audioCodec = audioStream.codec_name
					}

					duration = metadata.format.duration
					bitrate = metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : undefined

					// Generate thumbnail
					ffmpeg(filepath)
						.on('end', () => {
							logger.info('Video thumbnail generated', {
								filename: thumbnailFilename,
								duration,
								videoCodec,
								audioCodec,
								bitrate
							})
							resolve()
						})
						.on('error', (err) => {
							logger.error('Failed to generate video thumbnail', err)
							resolve() // Continue without thumbnail
						})
						.screenshots({
							timestamps: ['50%'], // Get frame at 50% of video duration
							filename: thumbnailFilename,
							folder: path.join(UPLOAD_DIR, 'thumbnails'),
							size: '1920x?' // Maintain aspect ratio with max 1920px width
						})
				})
			}).catch((err) => {
				// If ffmpeg fails, continue without metadata
				logger.warn('Video processing failed, continuing without metadata', err)
			})
		} else {
			// Process image with sharp
			try {
				const image = sharp(buffer)
				const metadata = await image.metadata()
				width = metadata.width || 0
				height = metadata.height || 0

				// Save original
				await writeFile(filepath, buffer)

				// Create thumbnail (max 1920px wide for high-res displays)
				await image
					.resize(1920, null, {
						fit: 'inside',
						withoutEnlargement: true
					})
					.jpeg({ quality: 85 }) // Good quality for larger thumbnails
					.toFile(thumbnailPath)
			} catch (imageError) {
				// If sharp fails (e.g., for SVG), just save the original
				logger.warn('Sharp processing failed, saving original only', imageError as Error)
				await writeFile(filepath, buffer)
			}
		}

		// Construct URLs
		const url = `${PUBLIC_PATH}/${type}/${filename}`
		const thumbnailUrl = existsSync(thumbnailPath)
			? `${PUBLIC_PATH}/thumbnails/${thumbnailFilename}`
			: null

		logger.info('File uploaded locally', {
			filename,
			type,
			size: file.size,
			dimensions: `${width}x${height}`,
			isVideo
		})

		return {
			success: true,
			filename,
			url,
			thumbnailUrl,
			width,
			height,
			size: file.size,
			duration,
			videoCodec,
			audioCodec,
			bitrate
		}
	} catch (error) {
		logger.error('Local upload failed', error as Error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Upload failed'
		}
	}
}

// Delete local file
export async function deleteFileLocally(url: string): Promise<boolean> {
	try {
		// Extract path from URL
		const relativePath = url.replace(PUBLIC_PATH, '')
		const filepath = path.join(UPLOAD_DIR, relativePath)

		// Check if file exists and delete
		if (existsSync(filepath)) {
			const { unlink } = await import('fs/promises')
			await unlink(filepath)

			// Try to delete thumbnail too
			const filename = path.basename(filepath)
			const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', `thumb-${filename}`)
			if (existsSync(thumbnailPath)) {
				await unlink(thumbnailPath)
			}

			return true
		}
		return false
	} catch (error) {
		logger.error('Local delete failed', error as Error)
		return false
	}
}
