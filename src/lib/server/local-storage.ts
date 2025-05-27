import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import sharp from 'sharp'
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
		const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', `thumb-${filename}`)
		
		// Convert File to buffer
		const arrayBuffer = await file.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)
		
		// Process image with sharp to get dimensions
		let width = 0
		let height = 0
		
		try {
			const image = sharp(buffer)
			const metadata = await image.metadata()
			width = metadata.width || 0
			height = metadata.height || 0
			
			// Save original
			await writeFile(filepath, buffer)
			
			// Create thumbnail (300x300)
			await image
				.resize(300, 300, {
					fit: 'cover',
					position: 'center'
				})
				.toFile(thumbnailPath)
				
		} catch (imageError) {
			// If sharp fails (e.g., for SVG), just save the original
			logger.warn('Sharp processing failed, saving original only', imageError as Error)
			await writeFile(filepath, buffer)
		}
		
		// Construct URLs
		const url = `${PUBLIC_PATH}/${type}/${filename}`
		const thumbnailUrl = `${PUBLIC_PATH}/thumbnails/thumb-${filename}`
		
		logger.info('File uploaded locally', {
			filename,
			type,
			size: file.size,
			dimensions: `${width}x${height}`
		})
		
		return {
			success: true,
			filename,
			url,
			thumbnailUrl,
			width,
			height,
			size: file.size
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