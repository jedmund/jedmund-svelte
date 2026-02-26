import { logger } from '../logger'
import { getConfig } from '../config'

interface MastodonPostResult {
	id: string
	url: string
}

interface PostInput {
	text: string
	url: string
	images?: { url: string; alt: string }[]
	videos?: { url: string }[]
}

export async function postToMastodon(input: PostInput): Promise<MastodonPostResult> {
	const instance = await getConfig('mastodon.instance')
	const accessToken = await getConfig('mastodon.access_token')

	if (!instance || !accessToken) {
		throw new Error('Mastodon credentials not configured (mastodon.instance, mastodon.access_token)')
	}

	const baseUrl = `https://${instance}`
	const fullText = input.text + '\n\n' + input.url

	const mediaIds: string[] = []

	// Upload videos first
	if (input.videos && input.videos.length > 0) {
		for (const video of input.videos) {
			if (mediaIds.length >= 4) break
			try {
				const mediaId = await uploadMedia(baseUrl, accessToken, video.url, '')
				if (mediaId) {
					mediaIds.push(mediaId)
				}
			} catch (error) {
				logger.error('Failed to upload video to Mastodon', error as Error, { videoUrl: video.url })
			}
		}
	}

	// Upload images (up to 4 total media)
	if (input.images && input.images.length > 0) {
		for (const img of input.images) {
			if (mediaIds.length >= 4) break
			try {
				const mediaId = await uploadMedia(baseUrl, accessToken, img.url, img.alt)
				if (mediaId) {
					mediaIds.push(mediaId)
				}
			} catch (error) {
				logger.error('Failed to upload image to Mastodon', error as Error, { imageUrl: img.url })
			}
		}
	}

	const statusBody: Record<string, unknown> = {
		status: fullText,
		visibility: 'public'
	}

	if (mediaIds.length > 0) {
		statusBody.media_ids = mediaIds
	}

	const response = await fetch(`${baseUrl}/api/v1/statuses`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(statusBody)
	})

	if (!response.ok) {
		const body = await response.text()
		logger.error('Mastodon status creation failed', undefined, {
			status: response.status,
			body: body.substring(0, 500)
		})
		throw new Error(`Mastodon API error: ${response.status}`)
	}

	const data = await response.json() as { id: string; url: string }

	logger.info('Posted to Mastodon', { id: data.id, url: data.url })

	return {
		id: data.id,
		url: data.url
	}
}

async function uploadMedia(baseUrl: string, accessToken: string, mediaUrl: string, alt: string): Promise<string | null> {
	try {
		const mediaResponse = await fetch(mediaUrl)
		if (!mediaResponse.ok) {
			logger.error('Failed to fetch media for Mastodon upload', undefined, { mediaUrl, status: mediaResponse.status })
			return null
		}

		const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream'
		const mediaBlob = await mediaResponse.blob()

		// Determine file extension from content type
		const extMap: Record<string, string> = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'image/webp': 'webp',
			'video/mp4': 'mp4',
			'video/webm': 'webm',
			'video/quicktime': 'mov'
		}
		const ext = extMap[contentType] || contentType.split('/')[1] || 'bin'
		const isVideo = contentType.startsWith('video/')
		const filename = isVideo ? `video.${ext}` : `image.${ext}`

		const formData = new FormData()
		formData.append('file', mediaBlob, filename)
		if (alt) {
			formData.append('description', alt)
		}

		const uploadResponse = await fetch(`${baseUrl}/api/v2/media`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${accessToken}`
			},
			body: formData
		})

		if (!uploadResponse.ok) {
			const body = await uploadResponse.text()
			logger.error('Mastodon media upload failed', undefined, {
				status: uploadResponse.status,
				body: body.substring(0, 500)
			})
			return null
		}

		const data = await uploadResponse.json() as { id: string }
		return data.id
	} catch (error) {
		logger.error('Failed to upload media to Mastodon', error as Error, { mediaUrl })
		return null
	}
}
