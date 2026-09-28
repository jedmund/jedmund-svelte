import type { EditorData } from '../../types/editor.js'
import type { ContentNode, Mark } from './types'
import { sanitize } from './sanitize'

export interface InlineExcerpt {
	html: string
	truncated: boolean
}

// Build an excerpt that renders the first paragraph of a Tiptap doc in full,
// preserving inline marks (bold/italic/link/code/etc.). The returned `html` is
// the paragraph's inner HTML (no outer <p>) so callers can splice inline CTAs
// like "Continue reading" into the same flow. `truncated` is true whenever
// there's any content beyond that first paragraph.
export const renderInlineExcerpt = (content: unknown): InlineExcerpt => {
	if (!content) return { html: '', truncated: false }

	const escapeHtml = (str: string): string =>
		str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;')

	const applyMarks = (text: string, marks: Mark[] | undefined): string => {
		if (!marks) return text
		let out = text
		for (const mark of marks) {
			switch (mark.type) {
				case 'bold':
					out = `<strong>${out}</strong>`
					break
				case 'italic':
					out = `<em>${out}</em>`
					break
				case 'underline':
					out = `<u>${out}</u>`
					break
				case 'strike':
					out = `<s>${out}</s>`
					break
				case 'code':
					out = `<code>${out}</code>`
					break
				case 'link': {
					const href = escapeHtml(String(mark.attrs?.href ?? '#'))
					const target = escapeHtml(String(mark.attrs?.target ?? '_blank'))
					out = `<a href="${href}" target="${target}" rel="noopener noreferrer">${out}</a>`
					break
				}
				case 'highlight':
					out = `<mark>${out}</mark>`
					break
				case 'subscript':
					out = `<sub>${out}</sub>`
					break
				case 'superscript':
					out = `<sup>${out}</sup>`
					break
			}
		}
		return out
	}

	const contentObj = content as Record<string, unknown>
	if (contentObj.type !== 'doc' || !Array.isArray(contentObj.content)) {
		const text = getContentExcerpt(content)
		return { html: escapeHtml(text), truncated: false }
	}

	const blocks = contentObj.content as ContentNode[]

	// Find the first paragraph that actually has some text content.
	let firstIndex = -1
	let firstParaHtml = ''
	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i]
		if (block.type !== 'paragraph') continue
		const inline = Array.isArray(block.content) ? block.content : []
		let paraHtml = ''
		for (const node of inline) {
			if (node.type !== 'text') continue
			paraHtml += applyMarks(escapeHtml(node.text ?? ''), node.marks)
		}
		if (paraHtml.trim()) {
			firstIndex = i
			firstParaHtml = paraHtml
			break
		}
	}

	if (firstIndex === -1) return { html: '', truncated: blocks.length > 0 }

	// Anything after the chosen paragraph counts as "more" content.
	const truncated = blocks.length > firstIndex + 1

	return { html: sanitize(firstParaHtml), truncated }
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
