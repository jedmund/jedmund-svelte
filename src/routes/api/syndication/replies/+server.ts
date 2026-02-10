import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { CacheManager } from '$lib/server/cache-manager'
import { getBlueskyAgent } from '$lib/server/bluesky/client'
import { getConfig } from '$lib/server/config'
import { logger } from '$lib/server/logger'

interface SocialReply {
	id: string
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
	replies?: SocialReply[]
}

export const GET: RequestHandler = async (event) => {
	const contentType = event.url.searchParams.get('contentType')
	const contentId = parseInt(event.url.searchParams.get('contentId') || '')

	if (!contentType || isNaN(contentId)) {
		return errorResponse('contentType and contentId are required', 400)
	}

	const cacheKey = `${contentType}:${contentId}`

	const cached = await CacheManager.get('syndication-replies', cacheKey)
	if (cached) {
		return jsonResponse(JSON.parse(cached))
	}

	const syndications = await prisma.syndication.findMany({
		where: { contentType, contentId, status: 'success' }
	})

	if (syndications.length === 0) {
		return jsonResponse({ replies: [], syndications: [] })
	}

	const replies: SocialReply[] = []

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

	replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

	const syndicationLinks = syndications.map(s => ({
		platform: s.platform,
		externalUrl: s.externalUrl
	}))

	const result = { replies, syndications: syndicationLinks }

	await CacheManager.set('syndication-replies', cacheKey, JSON.stringify(result))

	return jsonResponse(result)
}

interface BlueskyThreadPost {
	$type: string
	post: {
		author: { handle: string; displayName?: string; avatar?: string; did: string }
		record: { text: string; createdAt: string }
		uri: string
	}
	replies?: BlueskyThreadPost[]
}

function mapBlueskyPost(reply: BlueskyThreadPost): SocialReply {
	const post = reply.post
	const rkey = post.uri.split('/').pop()
	return {
		id: post.uri,
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
}

async function fetchBlueskyReplies(uri: string): Promise<SocialReply[]> {
	try {
		const agent = await getBlueskyAgent()
		const response = await agent.getPostThread({ uri, depth: 2 })

		if (!response.data.thread || response.data.thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
			return []
		}

		const thread = response.data.thread as BlueskyThreadPost
		if (!thread.replies) return []

		return thread.replies
			.filter(r => r.$type === 'app.bsky.feed.defs#threadViewPost')
			.map(reply => {
				const mapped = mapBlueskyPost(reply)
				if (reply.replies?.length) {
					mapped.replies = reply.replies
						.filter(r => r.$type === 'app.bsky.feed.defs#threadViewPost')
						.map(child => mapBlueskyPost(child))
				}
				return mapped
			})
	} catch (error) {
		logger.error('Failed to fetch Bluesky replies', error as Error, { uri })
		return []
	}
}

interface MastodonStatus {
	id: string
	in_reply_to_id: string | null
	account: { display_name: string; acct: string; avatar: string; url: string }
	content: string
	created_at: string
	url: string
}

function mapMastodonPost(status: MastodonStatus): SocialReply {
	return {
		id: status.id,
		platform: 'mastodon' as const,
		author: {
			name: status.account.display_name || status.account.acct,
			handle: `@${status.account.acct}`,
			avatarUrl: status.account.avatar,
			profileUrl: status.account.url
		},
		content: status.content,
		createdAt: status.created_at,
		url: status.url
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

		const data = await response.json() as { descendants: MastodonStatus[] }

		const directReplies = data.descendants.filter(d => d.in_reply_to_id === statusId)

		return directReplies.map(status => {
			const mapped = mapMastodonPost(status)
			const children = data.descendants.filter(d => d.in_reply_to_id === status.id)
			if (children.length) {
				mapped.replies = children.map(child => mapMastodonPost(child))
			}
			return mapped
		})
	} catch (error) {
		logger.error('Failed to fetch Mastodon replies', error as Error, { statusId })
		return []
	}
}
