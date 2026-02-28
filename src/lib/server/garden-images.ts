import { uploadFromUrl, isCloudinaryUrl, extractPublicId, deleteFile } from './cloudinary'
import { logger } from './logger'

interface CacheResult {
	imageUrl: string | null
	sourceImageUrl: string | null
}

/**
 * Cache a garden item's image through Cloudinary.
 *
 * - No image → return nulls
 * - Already a Cloudinary URL → pass through
 * - Same source as existing → skip re-upload
 * - New external URL → upload, delete old Cloudinary image if exists
 * - Upload failure → fall back to external URL
 */
export async function cacheGardenImage(
	incomingImageUrl: string | null | undefined,
	existingImageUrl: string | null | undefined,
	existingSourceImageUrl: string | null | undefined
): Promise<CacheResult> {
	if (!incomingImageUrl) {
		return { imageUrl: null, sourceImageUrl: null }
	}

	// Already a Cloudinary URL — no work needed
	if (isCloudinaryUrl(incomingImageUrl)) {
		return {
			imageUrl: incomingImageUrl,
			sourceImageUrl: existingSourceImageUrl ?? null
		}
	}

	// Same source URL as what's already cached — skip re-upload
	if (existingSourceImageUrl && incomingImageUrl === existingSourceImageUrl) {
		return {
			imageUrl: existingImageUrl ?? incomingImageUrl,
			sourceImageUrl: existingSourceImageUrl
		}
	}

	// New external URL — upload to Cloudinary
	const result = await uploadFromUrl(incomingImageUrl)

	if (result.success && result.secureUrl) {
		// Delete old Cloudinary image if it exists
		if (existingImageUrl && isCloudinaryUrl(existingImageUrl)) {
			const oldPublicId = extractPublicId(existingImageUrl)
			if (oldPublicId) {
				await deleteFile(oldPublicId)
			}
		}

		return {
			imageUrl: result.secureUrl,
			sourceImageUrl: incomingImageUrl
		}
	}

	// Upload failed — fall back to external URL
	logger.warn('Garden image cache failed, using external URL', {
		url: incomingImageUrl,
		error: result.error
	})

	return {
		imageUrl: incomingImageUrl,
		sourceImageUrl: null
	}
}
