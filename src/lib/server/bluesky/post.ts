import { RichText } from '@atproto/api'
import type { AppBskyFeedPost, AppBskyEmbedImages } from '@atproto/api'
import { getBlueskyAgent } from './client'
import { logger } from '../logger'

interface BlueskyPostResult {
	uri: string
	cid: string
	url: string
}

interface PostInput {
	text: string
	url: string
	images?: { url: string; alt: string }[]
	useExternalEmbed?: boolean
	title?: string
	description?: string
}

export async function postToBluesky(input: PostInput): Promise<BlueskyPostResult> {
	const agent = await getBlueskyAgent()

	// Build post text with link
	const fullText = input.text + '\n\n' + input.url

	// Use RichText for proper facet detection (links, mentions, etc.)
	const rt = new RichText({ text: fullText })
	await rt.detectFacets(agent)

	const post: AppBskyFeedPost.Record = {
		$type: 'app.bsky.feed.post',
		text: rt.text,
		facets: rt.facets,
		createdAt: new Date().toISOString()
	}

	// Attach embed: images or external link card
	if (input.images && input.images.length > 0) {
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
	} else if (input.useExternalEmbed) {
		// Use external embed (link card) for content without images
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

	// Construct the Bluesky URL from the URI
	// URI format: at://did:plc:xxx/app.bsky.feed.post/rkey
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

async function uploadImage(agent: ReturnType<typeof getBlueskyAgent> extends Promise<infer T> ? T : never, imageUrl: string): Promise<AppBskyEmbedImages.Image['image'] | null> {
	try {
		// Fetch the image
		const response = await fetch(imageUrl)
		if (!response.ok) {
			logger.error('Failed to fetch image for Bluesky upload', undefined, { imageUrl, status: response.status })
			return null
		}

		const contentType = response.headers.get('content-type') || 'image/jpeg'
		let imageData = new Uint8Array(await response.arrayBuffer())

		// Bluesky has a 1MB limit for images
		if (imageData.length > 1_000_000) {
			// Try to use a Cloudinary transformation to resize
			// Cloudinary URLs support on-the-fly transforms
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
	} catch (error) {
		logger.error('Failed to upload image to Bluesky', error as Error, { imageUrl })
		return null
	}
}
