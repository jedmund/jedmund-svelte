import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { checkAdminAuth } from '$lib/server/api-utils'
import {
	auditCloudinaryResources,
	deleteOrphanedFiles,
	cleanupBrokenReferences
} from '$lib/server/cloudinary-audit'
import { formatBytes } from '$lib/utils/format'
import { isCloudinaryConfigured } from '$lib/server/cloudinary'

export const GET: RequestHandler = async (event) => {
	try {
		if (!checkAdminAuth(event)) {
			return json({ error: 'Unauthorized' }, { status: 401 })
		}

		if (!isCloudinaryConfigured()) {
			return json({ error: 'Cloudinary is not configured' }, { status: 503 })
		}

		const audit = await auditCloudinaryResources()

		// Format the response with additional metadata
		const response = {
			summary: {
				totalCloudinaryFiles: audit.totalCloudinaryFiles,
				totalDatabaseReferences: audit.totalDatabaseReferences,
				orphanedFilesCount: audit.orphanedFiles.length,
				orphanedFilesSize: audit.orphanedTotalBytes,
				orphanedFilesSizeFormatted: formatBytes(audit.orphanedTotalBytes),
				missingReferencesCount: audit.missingFromCloudinary.length
			},
			orphanedFiles: audit.orphanedFiles.map((file) => ({
				publicId: file.public_id,
				url: file.secure_url,
				folder: file.folder || 'root',
				format: file.format,
				size: file.bytes,
				sizeFormatted: formatBytes(file.bytes),
				dimensions:
					file.width && file.height
						? {
								width: file.width,
								height: file.height
							}
						: null,
				createdAt: file.created_at
			})),
			missingReferences: audit.missingFromCloudinary
		}

		return json(response)
	} catch (error) {
		console.error('Cloudinary audit error:', error)
		return json({ error: 'Failed to audit Cloudinary resources' }, { status: 500 })
	}
}

export const DELETE: RequestHandler = async (event) => {
	try {
		if (!checkAdminAuth(event)) {
			return json({ error: 'Unauthorized' }, { status: 401 })
		}

		if (!isCloudinaryConfigured()) {
			return json({ error: 'Cloudinary is not configured' }, { status: 503 })
		}

		const body = await event.request.json()
		const { publicIds, dryRun = true } = body

		if (!Array.isArray(publicIds) || publicIds.length === 0) {
			return json({ error: 'No public IDs provided' }, { status: 400 })
		}

		// Limit the number of files that can be deleted at once
		if (publicIds.length > 100) {
			return json({ error: 'Cannot delete more than 100 files at once' }, { status: 400 })
		}

		const results = await deleteOrphanedFiles(publicIds, dryRun)

		return json({
			dryRun,
			results
		})
	} catch (error) {
		console.error('Cloudinary delete error:', error)
		return json({ error: 'Failed to delete Cloudinary resources' }, { status: 500 })
	}
}

export const PATCH: RequestHandler = async (event) => {
	try {
		if (!checkAdminAuth(event)) {
			return json({ error: 'Unauthorized' }, { status: 401 })
		}

		const body = await event.request.json()
		const { publicIds } = body

		if (!Array.isArray(publicIds) || publicIds.length === 0) {
			return json({ error: 'No public IDs provided' }, { status: 400 })
		}

		const results = await cleanupBrokenReferences(publicIds)

		return json({
			message: 'Broken references cleaned up',
			results
		})
	} catch (error) {
		console.error('Cleanup error:', error)
		return json({ error: 'Failed to clean up broken references' }, { status: 500 })
	}
}
