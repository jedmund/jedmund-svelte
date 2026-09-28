import { mediaRequest } from './requests'
export interface AuditData {
	summary: {
		totalCloudinaryFiles: number
		totalDatabaseReferences: number
		orphanedFilesCount: number
		orphanedFilesSize: number
		orphanedFilesSizeFormatted: string
		missingReferencesCount: number
	}
	orphanedFiles: Array<{
		publicId: string
		url: string
		folder: string
		format: string
		size: number
		sizeFormatted: string
		dimensions: { width: number; height: number } | null
		createdAt: string
	}>
	missingReferences: string[]
}
export interface CleanupResults {
	cleanedMedia: number
	cleanedProjects: number
	cleanedPosts: number
	errors: string[]
}
export interface DeleteResults {
	succeeded: number
	failed: string[]
}
export interface MediaStats {
	totalMedia: number
	missingColors: number
	missingAspectRatio: number
	outdatedThumbnails: number
	greyDominantColors: number
}
export interface RegenerationResults {
	processed: number
	succeeded: number
	failed: number
	errors: string[]
	photosUpdated: number
}
export interface ReanalysisResults {
	processed: number
	updated: number
	skipped: number
	errors: string[]
}
export const fetchAudit = (signal: AbortSignal) =>
	mediaRequest<AuditData>('/api/admin/cloudinary-audit', signal)
export const fetchMediaStats = (signal: AbortSignal) =>
	mediaRequest<MediaStats>('/api/admin/media-stats', signal)
export function deleteOrphans(publicIds: string[], dryRun: boolean, signal: AbortSignal) {
	return mediaRequest<{ results: DeleteResults }>('/api/admin/cloudinary-audit', signal, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ publicIds, dryRun })
	})
}
export function cleanupReferences(publicIds: string[], signal: AbortSignal) {
	return mediaRequest<{ results: CleanupResults }>('/api/admin/cloudinary-audit', signal, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ publicIds })
	})
}
export function regenerate(kind: 'colors' | 'thumbnails' | 'reanalyze', signal: AbortSignal) {
	const endpoints = {
		colors: 'cloudinary-extract-colors',
		thumbnails: 'regenerate-thumbnails',
		reanalyze: 'reanalyze-colors'
	}
	return mediaRequest<RegenerationResults | ReanalysisResults>(
		`/api/admin/${endpoints[kind]}`,
		signal,
		{ method: 'POST' }
	)
}
