/**
 * Client-side syndication utilities for preview generation.
 * Mirrors logic from src/lib/server/syndication/syndicate.ts — keep in sync.
 */
import { getContentExcerpt } from '$lib/utils/content'

interface TiptapNode {
	type: string
	attrs?: Record<string, unknown>
	content?: TiptapNode[]
}

const SYNDICATION_TEXT_LIMIT = 240

function truncateText(text: string, limit: number): string {
	if (text.length <= limit) return text
	return text.substring(0, limit - 3).trim() + '...'
}

export function extractMediaFromContent(content: unknown): {
	images: { url: string; alt: string }[]
	videos: { url: string }[]
} {
	const images: { url: string; alt: string }[] = []
	const videos: { url: string }[] = []

	if (!content || typeof content !== 'object') return { images, videos }

	function walk(node: TiptapNode) {
		if (node.type === 'image' && node.attrs?.src) {
			images.push({
				url: node.attrs.src as string,
				alt: (node.attrs.alt as string) || ''
			})
		}
		if (node.type === 'video' && node.attrs?.src) {
			videos.push({ url: node.attrs.src as string })
		}
		if (node.content && Array.isArray(node.content)) {
			for (const child of node.content) {
				if (images.length + videos.length >= 4) break
				walk(child)
			}
		}
	}

	walk(content as TiptapNode)
	return { images: images.slice(0, 4), videos: videos.slice(0, 4) }
}

export interface UrlEmbedData {
	url: string
	title?: string
	description?: string
	image?: string
	siteName?: string
}

export function extractUrlEmbedsFromContent(content: unknown): UrlEmbedData[] {
	const embeds: UrlEmbedData[] = []

	if (!content || typeof content !== 'object') return embeds

	function walk(node: TiptapNode) {
		if (node.type === 'urlEmbed' && node.attrs?.url) {
			embeds.push({
				url: node.attrs.url as string,
				title: (node.attrs.title as string) || undefined,
				description: (node.attrs.description as string) || undefined,
				image: (node.attrs.image as string) || undefined,
				siteName: (node.attrs.siteName as string) || undefined
			})
		}
		if (node.content && Array.isArray(node.content)) {
			for (const child of node.content) {
				walk(child)
			}
		}
	}

	walk(content as TiptapNode)
	return embeds
}

export function computeSyndicationText(opts: {
	syndicationText?: string
	postType: 'post' | 'essay'
	title?: string
	excerpt?: string
	content?: unknown
}): string {
	const { syndicationText, postType, title, excerpt, content } = opts

	// Priority 1: Custom syndication message
	if (syndicationText) {
		return syndicationText
	}

	// Priority 2: Essay with title
	if (postType === 'essay' && title) {
		if (excerpt) {
			return truncateText(title + '\n\n' + excerpt, SYNDICATION_TEXT_LIMIT)
		}
		return truncateText(title, SYNDICATION_TEXT_LIMIT)
	}

	// Priority 3: Excerpt
	if (excerpt) {
		return truncateText(excerpt, SYNDICATION_TEXT_LIMIT)
	}

	// Priority 4: Content excerpt
	const contentText = getContentExcerpt(content, SYNDICATION_TEXT_LIMIT)
	if (contentText) {
		return truncateText(contentText, SYNDICATION_TEXT_LIMIT)
	}

	return ''
}
