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

export function extractEmbeds(content: any): ExtractedEmbed[] {
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
	const findEmbeds = (node: any) => {
		if (node.type === 'urlEmbed' && node.attrs?.url) {
			const url = node.attrs.url
			const isYouTube = /(?:youtube\.com|youtu\.be)/.test(url)
			
			if (isYouTube) {
				const videoId = getYouTubeVideoId(url)
				if (videoId) {
					embeds.push({
						type: 'youtube',
						url,
						videoId,
						title: node.attrs.title,
						description: node.attrs.description,
						image: node.attrs.image,
						favicon: node.attrs.favicon,
						siteName: node.attrs.siteName
					})
				}
			} else {
				embeds.push({
					type: 'urlEmbed',
					url,
					title: node.attrs.title,
					description: node.attrs.description,
					image: node.attrs.image,
					favicon: node.attrs.favicon,
					siteName: node.attrs.siteName
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