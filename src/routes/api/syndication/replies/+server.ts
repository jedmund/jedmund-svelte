import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { CacheManager } from '$lib/server/cache-manager'
import { getBlueskyAgent } from '$lib/server/bluesky/client'
import { getConfig } from '$lib/server/config'
import { logger } from '$lib/server/logger'

interface SocialReply {
	platform: 'bluesky' | 'mastodon'
	author: {
		name: string
		handle: string
		avatarUrl: string
		profileUrl: string
	}
	content: string
	createdAt: string
	url: string
}

// GET /api/syndication/replies?contentType=post&contentId=123
export const GET: RequestHandler = async (event) => {
	const contentType = event.url.searchParams.get('contentType')
	const contentId = parseInt(event.url.searchParams.get('contentId') || '')

	if (!contentType || isNaN(contentId)) {
		return errorResponse('contentType and contentId are required', 400)
	}

	const cacheKey = `${contentType}:${contentId}`

	// Check cache first
	const cached = await CacheManager.get('syndication-replies', cacheKey)
	if (cached) {
		return jsonResponse(JSON.parse(cached))
	}

	// Look up syndication records
	const syndications = await prisma.syndication.findMany({
		where: { contentType, contentId, status: 'success' }
	})

	if (syndications.length === 0) {
		return jsonResponse({ replies: [], syndications: [] })
	}

	const replies: SocialReply[] = []

	// Fetch replies from each platform
	for (const syn of syndications) {
		try {
			if (syn.platform === 'bluesky' && syn.externalId) {
				const blueskyReplies = await fetchBlueskyReplies(syn.externalId)
				replies.push(...blueskyReplies)
			} else if (syn.platform === 'mastodon' && syn.externalId) {
				const mastodonReplies = await fetchMastodonReplies(syn.externalId)
				replies.push(...mastodonReplies)
			}
		} catch (error) {
			logger.error(`Failed to fetch replies from ${syn.platform}`, error as Error)
		}
	}

	// Sort by date
	replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

	const syndicationLinks = syndications.map(s => ({
		platform: s.platform,
		externalUrl: s.externalUrl
	}))

	const result = { replies, syndications: syndicationLinks }

	// Cache for 5 minutes
	await CacheManager.set('syndication-replies', cacheKey, JSON.stringify(result))

	return jsonResponse(result)
}

async function fetchBlueskyReplies(uri: string): Promise<SocialReply[]> {
	try {
		const agent = await getBlueskyAgent()
		const response = await agent.getPostThread({ uri, depth: 1 })

		if (!response.data.thread || response.data.thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
			return []
		}

		const thread = response.data.thread as { replies?: Array<{ $type: string; post: { author: { handle: string; displayName?: string; avatar?: string; did: string }; record: { text: string; createdAt: string }; uri: string } }> }
		if (!thread.replies) return []

		return thread.replies
			.filter(r => r.$type === 'app.bsky.feed.defs#threadViewPost')
			.map(reply => {
				const post = reply.post
				const rkey = post.uri.split('/').pop()
				return {
					platform: 'bluesky' as const,
					author: {
						name: post.author.displayName || post.author.handle,
						handle: `@${post.author.handle}`,
						avatarUrl: post.author.avatar || '',
						profileUrl: `https://bsky.app/profile/${post.author.handle}`
					},
					content: post.record.text,
					createdAt: post.record.createdAt,
					url: `https://bsky.app/profile/${post.author.did}/post/${rkey}`
				}
			})
	} catch (error) {
		logger.error('Failed to fetch Bluesky replies', error as Error, { uri })
		return []
	}
}

async function fetchMastodonReplies(statusId: string): Promise<SocialReply[]> {
	try {
		const mastodonInstance = await getConfig('mastodon.instance')
	const baseUrl = `https://${mastodonInstance || 'fireplace.cafe'}`
		const response = await fetch(`${baseUrl}/api/v1/statuses/${statusId}/context`)

		if (!response.ok) {
			logger.error('Failed to fetch Mastodon context', undefined, { statusId, status: response.status })
			return []
		}

		const data = await response.json() as {
			descendants: Array<{
				id: string
				account: { display_name: string; acct: string; avatar: string; url: string }
				content: string
				created_at: string
				url: string
			}>
		}

		return data.descendants.map(reply => ({
			platform: 'mastodon' as const,
			author: {
				name: reply.account.display_name || reply.account.acct,
				handle: `@${reply.account.acct}`,
				avatarUrl: reply.account.avatar,
				profileUrl: reply.account.url
			},
			content: reply.content,
			createdAt: reply.created_at,
			url: reply.url
		}))
	} catch (error) {
		logger.error('Failed to fetch Mastodon replies', error as Error, { statusId })
		return []
	}
}
