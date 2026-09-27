import type { AdminPost } from '$lib/types/admin'
export const postTypeLabels: Record<string, string> = {
	post: 'Post',
	essay: 'Essay'
}
export function getPostSnippet(post: AdminPost): string {
	// Try excerpt first
	if (post.excerpt) {
		return post.excerpt.length > 150 ? post.excerpt.substring(0, 150) + '...' : post.excerpt
	}

	// Try to extract text from content JSON
	if (post.content) {
		let textContent = ''

		if (
			typeof post.content === 'object' &&
			post.content &&
			(post.content as Record<string, unknown>).content
		) {
			// BlockNote/TipTap format
			function extractText(node: Record<string, unknown>): string {
				if (typeof node.text === 'string') return node.text
				if (Array.isArray(node.content)) {
					return node.content.map((n) => extractText(n as Record<string, unknown>)).join(' ')
				}
				return ''
			}
			textContent = extractText(post.content as Record<string, unknown>)
		} else if (typeof post.content === 'string') {
			textContent = post.content
		}

		if (textContent) {
			return textContent.length > 150 ? textContent.substring(0, 150) + '...' : textContent
		}
	}

	// Fallback to link description for link posts
	if (post.linkDescription) {
		return post.linkDescription.length > 150
			? post.linkDescription.substring(0, 150) + '...'
			: post.linkDescription
	}

	// Default fallback
	return `${postTypeLabels[post.postType] || post.postType} without content`
}
