import type { EditorData } from '$lib/types/editor'

// Content node types for rendering
interface ContentNode {
	type: string
	attrs?: Record<string, unknown>
	content?: ContentNode[] | string
	text?: string
	level?: number
	src?: string
	alt?: string
	caption?: string
	language?: string
	mediaId?: number
	marks?: Mark[]
	[key: string]: unknown
}

// Mark types (bold, italic, link, etc.)
interface Mark {
	type: string
	attrs?: Record<string, unknown>
}

// Render Edra/BlockNote JSON content to HTML
export const renderEdraContent = (content: unknown, options: { albumSlug?: string } = {}): string => {
	if (!content) return ''

	// Handle Tiptap format first (has type: 'doc')
	const contentObj = content as Record<string, unknown>
	if (contentObj.type === 'doc' && contentObj.content) {
		return renderTiptapContent(contentObj)
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

	return blocks.map(renderBlock).join('')
}

// Render Tiptap JSON content to HTML
function renderTiptapContent(doc: Record<string, unknown>): string {
	if (!doc || !doc.content) return ''

	const renderNode = (node: ContentNode): string => {
		switch (node.type) {
			case 'paragraph': {
				const content = renderInlineContent(Array.isArray(node.content) ? node.content : [])
				if (!content) return '<p><br></p>'
				return `<p>${content}</p>`
			}

			case 'heading': {
				const level = node.attrs?.level || 1
				const content = renderInlineContent(Array.isArray(node.content) ? node.content : [])
				return `<h${level}>${content}</h${level}>`
			}

			case 'bulletList': {
				const bulletItems = Array.isArray(node.content) ? node.content : []
				const items = bulletItems
					.map((item: ContentNode) => {
						const itemContent = Array.isArray(item.content) ? item.content.map(renderNode).join('') : ''
						return `<li>${itemContent}</li>`
					})
					.join('')
				return `<ul>${items}</ul>`
			}

			case 'orderedList': {
				const orderedItems = Array.isArray(node.content) ? node.content : []
				const items = orderedItems
					.map((item: ContentNode) => {
						const itemContent = Array.isArray(item.content) ? item.content.map(renderNode).join('') : ''
						return `<li>${itemContent}</li>`
					})
					.join('')
				return `<ol>${items}</ol>`
			}

			case 'listItem': {
				// List items are handled by their parent list
				return Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
			}

			case 'blockquote': {
				const content = Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
				return `<blockquote>${content}</blockquote>`
			}

			case 'codeBlock': {
				const language = (node.attrs?.language || '') as string
				const codeContent = Array.isArray(node.content) ? node.content[0]?.text || '' : ''
				return `<pre><code class="language-${language}">${escapeHtml(codeContent)}</code></pre>`
			}

			case 'image': {
				const src = (node.attrs?.src || '') as string
				const alt = (node.attrs?.alt || '') as string
				const title = (node.attrs?.title || '') as string
				const width = node.attrs?.width
				const height = node.attrs?.height
				const widthAttr = width ? ` width="${width}"` : ''
				const heightAttr = height ? ` height="${height}"` : ''

				// Check if we have a media ID stored in attributes first
				const mediaId = node.attrs?.mediaId || extractMediaIdFromUrl(src)

				if (mediaId) {
					// Always use direct photo permalink
					const photoUrl = `/photos/${mediaId}`
					return `<figure class="interactive-figure"><a href="${photoUrl}" class="photo-link"><img src="${src}" alt="${alt}"${widthAttr}${heightAttr} /></a>${title ? `<figcaption>${title}</figcaption>` : ''}</figure>`
				} else {
					return `<figure><img src="${src}" alt="${alt}"${widthAttr}${heightAttr} />${title ? `<figcaption>${title}</figcaption>` : ''}</figure>`
				}
			}

			case 'horizontalRule': {
				return '<hr>'
			}

			case 'hardBreak': {
				return '<br>'
			}

			case 'urlEmbed': {
				const url = (node.attrs?.url || '') as string
				const title = (node.attrs?.title || '') as string
				const description = (node.attrs?.description || '') as string
				const image = (node.attrs?.image || '') as string
				const favicon = (node.attrs?.favicon || '') as string
				const siteName = (node.attrs?.siteName || '') as string

				// Helper to get domain from URL
				const getDomain = (url: string) => {
					try {
						const urlObj = new URL(url)
						return urlObj.hostname.replace('www.', '')
					} catch {
						return ''
					}
				}

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

				// Check if it's a YouTube URL
				const isYouTube = /(?:youtube\.com|youtu\.be)/.test(url)
				const videoId = isYouTube ? getYouTubeVideoId(url) : null

				if (isYouTube && videoId) {
					// Render YouTube embed
					let embedHtml = '<div class="url-embed-rendered url-embed-youtube">'
					embedHtml += '<div class="youtube-embed-wrapper">'
					embedHtml += `<iframe src="https://www.youtube.com/embed/${videoId}" `
					embedHtml += 'frameborder="0" '
					embedHtml +=
						'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" '
					embedHtml += 'allowfullscreen>'
					embedHtml += '</iframe>'
					embedHtml += '</div>'
					embedHtml += '</div>'
					return embedHtml
				}

				// Regular URL embed for non-YouTube links
				let embedHtml = '<div class="url-embed-rendered">'
				embedHtml += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="url-embed-link">`

				if (image) {
					embedHtml += `<div class="url-embed-image"><img src="${image}" alt="${title || 'Link preview'}" /></div>`
				}

				embedHtml += '<div class="url-embed-text">'
				embedHtml += '<div class="url-embed-meta">'
				if (favicon) {
					embedHtml += `<img src="${favicon}" alt="" class="url-embed-favicon" />`
				}
				embedHtml += `<span class="url-embed-domain">${siteName || getDomain(url)}</span>`
				embedHtml += '</div>'

				if (title) {
					embedHtml += `<h3 class="url-embed-title">${title}</h3>`
				}

				if (description) {
					embedHtml += `<p class="url-embed-description">${description}</p>`
				}

				embedHtml += '</div>'
				embedHtml += '</a>'
				embedHtml += '</div>'

				return embedHtml
			}

			case 'audio': {
				const src = (node.attrs?.src || '') as string
				const title = (node.attrs?.title || '') as string
				const waveformData = node.attrs?.waveformData as number[] | null | undefined
				const waveformAttr = waveformData
					? ` data-waveform="${escapeHtml(JSON.stringify(waveformData))}"`
					: ''
				let html = '<figure class="audio-figure">'
				html += `<div data-audio-player data-src="${escapeHtml(src)}" data-title="${escapeHtml(title)}"${waveformAttr}></div>`
				if (title) html += `<figcaption>${escapeHtml(title)}</figcaption>`
				html += '</figure>'
				return html
			}

			default: {
				// For any unknown block types, try to render their content
				if (node.content) {
					return Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
				}
				return ''
			}
		}
	}

	// Render inline content (text nodes with marks)
	const renderInlineContent = (content: ContentNode[]): string => {
		return content
			.map((node: ContentNode) => {
				if (node.type === 'text') {
					let text = escapeHtml(node.text || '')

					// Apply marks (bold, italic, etc.)
					if (node.marks) {
						node.marks.forEach((mark: Mark) => {
							switch (mark.type) {
								case 'bold':
									text = `<strong>${text}</strong>`
									break
								case 'italic':
									text = `<em>${text}</em>`
									break
								case 'underline':
									text = `<u>${text}</u>`
									break
								case 'strike':
									text = `<s>${text}</s>`
									break
								case 'code':
									text = `<code>${text}</code>`
									break
								case 'link': {
									const href = mark.attrs?.href || '#'
									const target = mark.attrs?.target || '_blank'
									text = `<a href="${href}" target="${target}" rel="noopener noreferrer">${text}</a>`
									break
								}
								case 'highlight':
									text = `<mark>${text}</mark>`
									break
							}
						})
					}

					return text
				}

				// Handle other inline nodes
				return renderNode(node)
			})
			.join('')
	}

	// Helper to escape HTML
	const escapeHtml = (str: string): string => {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;')
	}

	return (doc.content as ContentNode[]).map(renderNode).join('')
}

// Extract text content from Edra JSON for excerpt
export const getContentExcerpt = (content: EditorData | unknown, maxLength = 200): string => {
	if (!content) return ''

	// Type guard for content object
	const contentObj = content as Record<string, unknown>

	// Handle Tiptap format first (has type: 'doc')
	if (contentObj.type === 'doc' && contentObj.content) {
		return extractTiptapText(contentObj, maxLength)
	}

	// Handle both { blocks: [...] } and { content: [...] } formats
	const blocks = (contentObj.blocks || contentObj.content || []) as ContentNode[]
	if (!Array.isArray(blocks)) return ''

	const extractText = (node: ContentNode): string => {
		// For block-level content
		if (node.type && node.content && typeof node.content === 'string') {
			return node.content
		}
		// For inline content with text property
		if (node.text) return node.text
		// For nested content
		if (node.content && Array.isArray(node.content)) {
			return node.content.map(extractText).join(' ')
		}
		return ''
	}

	const text = blocks.map(extractText).join(' ').trim()
	if (text.length <= maxLength) return text
	return text.substring(0, maxLength).trim() + '...'
}

// Extract text from Tiptap content
function extractTiptapText(doc: Record<string, unknown>, maxLength: number): string {
	const extractFromNode = (node: ContentNode): string => {
		if (node.type === 'text') {
			return node.text || ''
		}

		if (node.content && Array.isArray(node.content)) {
			return node.content.map(extractFromNode).join(' ')
		}

		return ''
	}

	const content = doc.content as ContentNode[]
	const text = content.map(extractFromNode).join(' ').trim()
	if (text.length <= maxLength) return text
	return text.substring(0, maxLength).trim() + '...'
}

// Helper function to extract media ID from Cloudinary URL
function extractMediaIdFromUrl(url: string): string | null {
	if (!url) return null

	// Match Cloudinary URLs with media ID pattern
	// Example: https://res.cloudinary.com/jedmund/image/upload/v1234567890/media/123.jpg
	const cloudinaryMatch = url.match(/\/media\/(\d+)(?:\.|$)/)
	if (cloudinaryMatch) {
		return cloudinaryMatch[1]
	}

	// Fallback: try to extract numeric ID from filename
	const filenameMatch = url.match(/\/(\d+)\.[^/]*$/)
	if (filenameMatch) {
		return filenameMatch[1]
	}

	return null
}
