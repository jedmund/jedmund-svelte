// Render Edra/BlockNote JSON content to HTML
export const renderEdraContent = (content: any): string => {
	if (!content) return ''

	// Handle Tiptap format first (has type: 'doc')
	if (content.type === 'doc' && content.content) {
		return renderTiptapContent(content)
	}

	// Handle both { blocks: [...] } and { content: [...] } formats
	const blocks = content.blocks || content.content || []
	if (!Array.isArray(blocks)) return ''

	const renderBlock = (block: any): string => {
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
				const listItems = (block.content || [])
					.map((item: any) => {
						const itemText = item.content || item.text || ''
						return `<li>${itemText}</li>`
					})
					.join('')
				return `<ul>${listItems}</ul>`
			}

			case 'orderedList':
			case 'ol': {
				const orderedItems = (block.content || [])
					.map((item: any) => {
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
				const src = block.attrs?.src || block.src || ''
				const alt = block.attrs?.alt || block.alt || ''
				const caption = block.attrs?.caption || block.caption || ''
				return `<figure><img src="${src}" alt="${alt}" />${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
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
function renderTiptapContent(doc: any): string {
	if (!doc || !doc.content) return ''

	const renderNode = (node: any): string => {
		switch (node.type) {
			case 'paragraph': {
				const content = renderInlineContent(node.content || [])
				if (!content) return '<p><br></p>'
				return `<p>${content}</p>`
			}

			case 'heading': {
				const level = node.attrs?.level || 1
				const content = renderInlineContent(node.content || [])
				return `<h${level}>${content}</h${level}>`
			}

			case 'bulletList': {
				const items = (node.content || [])
					.map((item: any) => {
						const itemContent = item.content?.map(renderNode).join('') || ''
						return `<li>${itemContent}</li>`
					})
					.join('')
				return `<ul>${items}</ul>`
			}

			case 'orderedList': {
				const items = (node.content || [])
					.map((item: any) => {
						const itemContent = item.content?.map(renderNode).join('') || ''
						return `<li>${itemContent}</li>`
					})
					.join('')
				return `<ol>${items}</ol>`
			}

			case 'listItem': {
				// List items are handled by their parent list
				return node.content?.map(renderNode).join('') || ''
			}

			case 'blockquote': {
				const content = node.content?.map(renderNode).join('') || ''
				return `<blockquote>${content}</blockquote>`
			}

			case 'codeBlock': {
				const language = node.attrs?.language || ''
				const content = node.content?.[0]?.text || ''
				return `<pre><code class="language-${language}">${escapeHtml(content)}</code></pre>`
			}

			case 'image': {
				const src = node.attrs?.src || ''
				const alt = node.attrs?.alt || ''
				const title = node.attrs?.title || ''
				const width = node.attrs?.width
				const height = node.attrs?.height
				const widthAttr = width ? ` width="${width}"` : ''
				const heightAttr = height ? ` height="${height}"` : ''
				return `<figure><img src="${src}" alt="${alt}"${widthAttr}${heightAttr} />${title ? `<figcaption>${title}</figcaption>` : ''}</figure>`
			}

			case 'horizontalRule': {
				return '<hr>'
			}

			case 'hardBreak': {
				return '<br>'
			}

			case 'urlEmbed': {
				const url = node.attrs?.url || ''
				const title = node.attrs?.title || ''
				const description = node.attrs?.description || ''
				const image = node.attrs?.image || ''
				const favicon = node.attrs?.favicon || ''
				const siteName = node.attrs?.siteName || ''
				
				// Helper to get domain from URL
				const getDomain = (url: string) => {
					try {
						const urlObj = new URL(url)
						return urlObj.hostname.replace('www.', '')
					} catch {
						return ''
					}
				}
				
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

			default: {
				// For any unknown block types, try to render their content
				if (node.content) {
					return node.content.map(renderNode).join('')
				}
				return ''
			}
		}
	}

	// Render inline content (text nodes with marks)
	const renderInlineContent = (content: any[]): string => {
		return content
			.map((node: any) => {
				if (node.type === 'text') {
					let text = escapeHtml(node.text || '')

					// Apply marks (bold, italic, etc.)
					if (node.marks) {
						node.marks.forEach((mark: any) => {
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
								case 'link':
									const href = mark.attrs?.href || '#'
									const target = mark.attrs?.target || '_blank'
									text = `<a href="${href}" target="${target}" rel="noopener noreferrer">${text}</a>`
									break
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

	return doc.content.map(renderNode).join('')
}

// Extract text content from Edra JSON for excerpt
export const getContentExcerpt = (content: any, maxLength = 200): string => {
	if (!content) return ''

	// Handle Tiptap format first (has type: 'doc')
	if (content.type === 'doc' && content.content) {
		return extractTiptapText(content, maxLength)
	}

	// Handle both { blocks: [...] } and { content: [...] } formats
	const blocks = content.blocks || content.content || []
	if (!Array.isArray(blocks)) return ''

	const extractText = (node: any): string => {
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
function extractTiptapText(doc: any, maxLength: number): string {
	const extractFromNode = (node: any): string => {
		if (node.type === 'text') {
			return node.text || ''
		}

		if (node.content && Array.isArray(node.content)) {
			return node.content.map(extractFromNode).join(' ')
		}

		return ''
	}

	const text = doc.content.map(extractFromNode).join(' ').trim()
	if (text.length <= maxLength) return text
	return text.substring(0, maxLength).trim() + '...'
}
