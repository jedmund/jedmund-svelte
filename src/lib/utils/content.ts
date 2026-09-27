import type { ContentNode } from './content/types'
import { sanitize } from './content/sanitize'
import { renderTiptapContent } from './content/tiptap-renderer'
import { extractMediaIdFromUrl } from './content/media-url'

// Render Edra/BlockNote JSON content to HTML
export const renderEdraContent = (
	content: unknown,
	options: { albumSlug?: string } = {}
): string => {
	if (!content) return ''

	// Handle Tiptap format first (has type: 'doc')
	const contentObj = content as Record<string, unknown>
	if (contentObj.type === 'doc' && contentObj.content) {
		return sanitize(renderTiptapContent(contentObj, options))
	}

	// Handle both { blocks: [...] } and { content: [...] } formats
	const blocks = (contentObj.blocks || contentObj.content || []) as ContentNode[]
	if (!Array.isArray(blocks)) return ''

	const renderBlock = (block: ContentNode): string => {
		switch (block.type) {
			case 'heading': {
				const level = block.attrs?.level || block.level || 1
				const headingText = block.content || block.text || ''
				return `<h${level}>${headingText}</h${level}>`
			}

			case 'paragraph': {
				const paragraphText = block.content || block.text || ''
				if (!paragraphText) return '<p><br></p>'
				return `<p>${paragraphText}</p>`
			}

			case 'bulletList':
			case 'ul': {
				const listContentArr = Array.isArray(block.content) ? block.content : []
				const listItems = listContentArr
					.map((item: ContentNode) => {
						const itemText = item.content || item.text || ''
						return `<li>${itemText}</li>`
					})
					.join('')
				return `<ul>${listItems}</ul>`
			}

			case 'orderedList':
			case 'ol': {
				const orderedContentArr = Array.isArray(block.content) ? block.content : []
				const orderedItems = orderedContentArr
					.map((item: ContentNode) => {
						const itemText = item.content || item.text || ''
						return `<li>${itemText}</li>`
					})
					.join('')
				return `<ol>${orderedItems}</ol>`
			}

			case 'blockquote': {
				const quoteText = block.content || block.text || ''
				return `<blockquote><p>${quoteText}</p></blockquote>`
			}

			case 'codeBlock':
			case 'code': {
				const codeText = block.content || block.text || ''
				const language = block.attrs?.language || block.language || ''
				return `<pre><code class="language-${language}">${codeText}</code></pre>`
			}

			case 'image': {
				const src = (block.attrs?.src || block.src || '') as string
				const alt = (block.attrs?.alt || block.alt || '') as string
				const caption = (block.attrs?.caption || block.caption || '') as string

				// Check if we have a media ID stored in attributes first
				const mediaId = block.attrs?.mediaId || block.mediaId || extractMediaIdFromUrl(src)

				if (mediaId) {
					// Use album context for URL if available
					const photoUrl = options.albumSlug
						? `/photos/${options.albumSlug}/${mediaId}`
						: `/photos/p/${mediaId}`
					return `<figure class="interactive-figure"><a href="${photoUrl}" class="photo-link"><img src="${src}" alt="${alt}" /></a>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
				} else {
					return `<figure><img src="${src}" alt="${alt}" />${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
				}
			}

			case 'hr':
			case 'horizontalRule':
				return '<hr>'

			default: {
				// For simple text content
				const text = block.content || block.text || ''
				if (text) {
					return `<p>${text}</p>`
				}
				return ''
			}
		}
	}

	return sanitize(blocks.map(renderBlock).join(''))
}
