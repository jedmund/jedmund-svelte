import { RichText, type AtpAgent, type BlobRef } from '@atproto/api'
import type { AppBskyFeedPost, AppBskyEmbedImages, AppBskyEmbedVideo } from '@atproto/api'
import { getBlueskyAgent } from './client'
import { logger } from '../logger'

interface BlueskyPostResult {
	uri: string
	cid: string
	url: string
}

interface PostInput {
	text: string
	url?: string
	images?: { url: string; alt: string }[]
	videos?: { url: string }[]
	useExternalEmbed?: boolean
	title?: string
	description?: string
}

export async function postToBluesky(input: PostInput): Promise<BlueskyPostResult> {
	const agent = await getBlueskyAgent()

	const fullText = input.url ? input.text + '\n\n' + input.url : input.text
	const rt = new RichText({ text: fullText })
	await rt.detectFacets(agent)

	const post: AppBskyFeedPost.Record = {
		$type: 'app.bsky.feed.post',
		text: rt.text,
		facets: rt.facets,
		createdAt: new Date().toISOString()
	}

	// Video takes priority over images on Bluesky (only 1 video allowed, can't mix with images)
	if (input.videos && input.videos.length > 0) {
		try {
			const videoBlob = await uploadVideo(agent, input.videos[0].url)
			if (videoBlob) {
				const videoEmbed: AppBskyEmbedVideo.Main = {
					video: videoBlob,
					alt: ''
				}
				post.embed = { $type: 'app.bsky.embed.video', ...videoEmbed }
			}
		} catch (error) {
			logger.error('Failed to upload video to Bluesky, falling back to images', error as Error)
			// Fall through to image logic
			await attachImages(post, agent, input)
		}

		if (!post.embed) {
			await attachImages(post, agent, input)
		}
	} else if (input.images && input.images.length > 0) {
		await attachImages(post, agent, input)
	} else if (input.useExternalEmbed && input.url) {
		post.embed = {
			$type: 'app.bsky.embed.external' as const,
			external: {
				uri: input.url,
				title: input.title || '',
				description: input.description || ''
			}
		}
	}

	const response = await agent.post(post)

	const did = agent.session?.did
	const rkey = response.uri.split('/').pop()
	const url = `https://bsky.app/profile/${did}/post/${rkey}`

	logger.info('Posted to Bluesky', { uri: response.uri, url })

	return {
		uri: response.uri,
		cid: response.cid,
		url
	}
}

async function attachImages(post: AppBskyFeedPost.Record, agent: AtpAgent, input: PostInput) {
	if (!input.images || input.images.length === 0) return

	const imageEmbeds: AppBskyEmbedImages.Image[] = []

	for (const img of input.images.slice(0, 4)) {
		try {
			const blob = await uploadImage(agent, img.url)
			if (blob) {
				imageEmbeds.push({
					image: blob,
					alt: img.alt || '',
					aspectRatio: undefined
				})
			}
		} catch (error) {
			logger.error('Failed to upload image to Bluesky', error as Error, { imageUrl: img.url })
		}
	}

	if (imageEmbeds.length > 0) {
		post.embed = {
			$type: 'app.bsky.embed.images',
			images: imageEmbeds
		}
	}
}

async function uploadImage(agent: AtpAgent, imageUrl: string): Promise<AppBskyEmbedImages.Image['image'] | null> {
	const response = await fetch(imageUrl)
	if (!response.ok) {
		logger.error('Failed to fetch image for Bluesky upload', undefined, { imageUrl, status: response.status })
		return null
	}

	const contentType = response.headers.get('content-type') || 'image/jpeg'
	let imageData = new Uint8Array(await response.arrayBuffer())

	if (imageData.length > 1_000_000) {
		const resizedUrl = imageUrl.replace('/upload/', '/upload/w_1200,q_80/')
		const resizedResponse = await fetch(resizedUrl)
		if (resizedResponse.ok) {
			imageData = new Uint8Array(await resizedResponse.arrayBuffer())
		}

		if (imageData.length > 1_000_000) {
			logger.warn('Image still too large for Bluesky after resize', { imageUrl, size: imageData.length })
			return null
		}
	}

	const uploadResponse = await agent.uploadBlob(imageData, { encoding: contentType })
	return uploadResponse.data.blob
}

async function uploadVideo(agent: AtpAgent, videoUrl: string): Promise<BlobRef | null> {
	const response = await fetch(videoUrl)
	if (!response.ok) {
		logger.error('Failed to fetch video for Bluesky upload', undefined, { videoUrl, status: response.status })
		return null
	}

	const videoData = new Uint8Array(await response.arrayBuffer())

	// Check size limit (100MB)
	if (videoData.length > 100_000_000) {
		logger.warn('Video too large for Bluesky upload', { videoUrl, size: videoData.length })
		return null
	}

	// Check upload limits
	try {
		const limits = await agent.app.bsky.video.getUploadLimits()
		if (!limits.data.canUpload) {
			logger.warn('Bluesky video upload limit reached', { message: limits.data.message })
			return null
		}
	} catch (error) {
		logger.warn('Failed to check Bluesky video upload limits', { error: String(error) })
		// Continue anyway
	}

	// Upload the video
	const uploadResponse = await agent.app.bsky.video.uploadVideo(videoData, {
		encoding: 'video/mp4'
	})

	const jobId = uploadResponse.data.jobStatus.jobId
	if (!jobId) {
		logger.error('No job ID returned from Bluesky video upload')
		return null
	}

	// Poll for completion (timeout ~60s)
	const maxAttempts = 30
	for (let i = 0; i < maxAttempts; i++) {
		await new Promise(resolve => setTimeout(resolve, 2000))

		const jobStatus = await agent.app.bsky.video.getJobStatus({ jobId })
		const state = jobStatus.data.jobStatus.state

		if (state === 'JOB_STATE_COMPLETED') {
			return jobStatus.data.jobStatus.blob ?? null
		}

		if (state === 'JOB_STATE_FAILED') {
			logger.error('Bluesky video processing failed', undefined, {
				jobId,
				error: jobStatus.data.jobStatus.error || 'Unknown error'
			})
			return null
		}
	}

	logger.error('Bluesky video processing timed out', undefined, { jobId })
	return null
}
