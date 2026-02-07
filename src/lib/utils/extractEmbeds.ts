import type { TiptapNode } from '$lib/types/editor'

// Extract URL embeds from Tiptap content
export interface ExtractedEmbed {
	type: 'urlEmbed' | 'youtube'
	url: string
	title?: string
	description?: string
	image?: string
	favicon?: string
	siteName?: string
	videoId?: string
}

export function extractEmbeds(content: TiptapNode): ExtractedEmbed[] {
	if (!content || !content.content) return []

	const embeds: ExtractedEmbed[] = []

	// Helper to extract YouTube video ID
	const getYouTubeVideoId = (url: string): string | null => {
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
			/youtube\.com\/watch\?.*v=([^&\n?#]+)/
		]

		for (const pattern of patterns) {
			const match = url.match(pattern)
			if (match && match[1]) {
				return match[1]
			}
		}
		return null
	}

	// Recursive function to find embed nodes
	const findEmbeds = (node: TiptapNode) => {
		if (node.type === 'urlEmbed' && node.attrs?.url) {
			const url = node.attrs.url as string
			const isYouTube = /(?:youtube\.com|youtu\.be)/.test(url)

			if (isYouTube) {
				const videoId = getYouTubeVideoId(url)
				if (videoId) {
					embeds.push({
						type: 'youtube',
						url,
						videoId,
						title: node.attrs.title as string | undefined,
						description: node.attrs.description as string | undefined,
						image: node.attrs.image as string | undefined,
						favicon: node.attrs.favicon as string | undefined,
						siteName: node.attrs.siteName as string | undefined
					})
				}
			} else {
				embeds.push({
					type: 'urlEmbed',
					url,
					title: node.attrs.title as string | undefined,
					description: node.attrs.description as string | undefined,
					image: node.attrs.image as string | undefined,
					favicon: node.attrs.favicon as string | undefined,
					siteName: node.attrs.siteName as string | undefined
				})
			}
		}

		// Recursively check child nodes
		if (node.content && Array.isArray(node.content)) {
			node.content.forEach(findEmbeds)
		}
	}

	// Start searching from the root
	if (content.content && Array.isArray(content.content)) {
		content.content.forEach(findEmbeds)
	}

	return embeds
}
