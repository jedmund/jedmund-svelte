import type { Media } from '@prisma/client'

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file type from MIME type
 */
export function getFileType(mimeType: string): string {
	if (mimeType.startsWith('image/')) return 'Image'
	if (mimeType.startsWith('video/')) return 'Video'
	if (mimeType.startsWith('audio/')) return 'Audio'
	if (mimeType.includes('pdf')) return 'PDF'
	if (mimeType === 'image/svg+xml') return 'SVG'
	return 'File'
}

/**
 * Check if a file is an image
 */
export function isImageFile(mimeType: string): boolean {
	return mimeType.startsWith('image/')
}

/**
 * Check if a file is a video
 */
export function isVideoFile(mimeType: string): boolean {
	return mimeType.startsWith('video/')
}

/**
 * Generate thumbnail URL for media
 */
export function generateThumbnailUrl(media: Media): string {
	// For SVGs, use the original URL
	if (media.mimeType === 'image/svg+xml') {
		return media.url
	}
	// Use thumbnail URL if available, otherwise fallback to main URL
	return media.thumbnailUrl || media.url
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
	const parts = filename.split('.')
	return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Validate if file type is accepted
 */
export function validateFileType(file: File, acceptedTypes: string[]): boolean {
	// If no types specified, accept all
	if (acceptedTypes.length === 0) return true

	// Check if file type matches any accepted type
	return acceptedTypes.some((type) => {
		if (type === 'image/*') return file.type.startsWith('image/')
		if (type === 'video/*') return file.type.startsWith('video/')
		if (type === 'audio/*') return file.type.startsWith('audio/')
		return file.type === type
	})
}

/**
 * Get display name for MIME type
 */
export function getMimeTypeDisplayName(mimeType: string): string {
	const typeMap: Record<string, string> = {
		'image/jpeg': 'JPEG Image',
		'image/png': 'PNG Image',
		'image/gif': 'GIF Image',
		'image/webp': 'WebP Image',
		'image/svg+xml': 'SVG Image',
		'video/mp4': 'MP4 Video',
		'video/webm': 'WebM Video',
		'audio/mpeg': 'MP3 Audio',
		'audio/wav': 'WAV Audio',
		'application/pdf': 'PDF Document'
	}

	return typeMap[mimeType] || getFileType(mimeType)
}

/**
 * Format duration from seconds to readable format
 */
export function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.floor(seconds % 60)
	
	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
	}
	return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format bitrate to readable format
 */
export function formatBitrate(bitrate: number): string {
	if (bitrate < 1000) return `${bitrate} bps`
	if (bitrate < 1000000) return `${(bitrate / 1000).toFixed(0)} kbps`
	return `${(bitrate / 1000000).toFixed(1)} Mbps`
}
