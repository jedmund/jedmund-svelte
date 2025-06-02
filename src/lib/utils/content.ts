// Render Edra/BlockNote JSON content to HTML
export const renderEdraContent = (content: any): string => {
	if (!content) return ''

	// Handle both { blocks: [...] } and { content: [...] } formats
	const blocks = content.blocks || content.content || []
	if (!Array.isArray(blocks)) return ''

	const renderBlock = (block: any): string => {
		switch (block.type) {
			case 'heading':
				const level = block.attrs?.level || block.level || 1
				const headingText = block.content || block.text || ''
				return `<h${level}>${headingText}</h${level}>`

			case 'paragraph':
				const paragraphText = block.content || block.text || ''
				if (!paragraphText) return '<p><br></p>'
				return `<p>${paragraphText}</p>`

			case 'bulletList':
			case 'ul':
				const listItems = (block.content || [])
					.map((item: any) => {
						const itemText = item.content || item.text || ''
						return `<li>${itemText}</li>`
					})
					.join('')
				return `<ul>${listItems}</ul>`

			case 'orderedList':
			case 'ol':
				const orderedItems = (block.content || [])
					.map((item: any) => {
						const itemText = item.content || item.text || ''
						return `<li>${itemText}</li>`
					})
					.join('')
				return `<ol>${orderedItems}</ol>`

			case 'blockquote':
				const quoteText = block.content || block.text || ''
				return `<blockquote><p>${quoteText}</p></blockquote>`

			case 'codeBlock':
			case 'code':
				const codeText = block.content || block.text || ''
				const language = block.attrs?.language || block.language || ''
				return `<pre><code class="language-${language}">${codeText}</code></pre>`

			case 'image':
				const src = block.attrs?.src || block.src || ''
				const alt = block.attrs?.alt || block.alt || ''
				const caption = block.attrs?.caption || block.caption || ''
				return `<figure><img src="${src}" alt="${alt}" />${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`

			case 'hr':
			case 'horizontalRule':
				return '<hr>'

			default:
				// For simple text content
				const text = block.content || block.text || ''
				if (text) {
					return `<p>${text}</p>`
				}
				return ''
		}
	}

	return blocks.map(renderBlock).join('')
}

// Extract text content from Edra JSON for excerpt
export const getContentExcerpt = (content: any, maxLength = 200): string => {
	if (!content || !content.content) return ''

	const extractText = (node: any): string => {
		if (node.text) return node.text
		if (node.content && Array.isArray(node.content)) {
			return node.content.map(extractText).join(' ')
		}
		return ''
	}

	const text = content.content.map(extractText).join(' ').trim()
	if (text.length <= maxLength) return text
	return text.substring(0, maxLength).trim() + '...'
}