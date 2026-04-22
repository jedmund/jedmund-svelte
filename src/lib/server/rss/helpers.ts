import type { Prisma } from '@prisma/client'
import { renderEdraContent } from '$lib/utils/content'

interface TextNode {
	type: 'text'
	text: string
	marks?: unknown[]
}

interface ParagraphNode {
	type: 'paragraph'
	content?: (TextNode | ContentNode)[]
}

interface ContentNode {
	type: string
	content?: ContentNode[]
	attrs?: Record<string, unknown>
}

interface DocContent {
	type: 'doc'
	content?: ContentNode[]
}

export function escapeXML(str: string): string {
	if (!str) return ''
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

export function formatRFC822Date(date: Date): string {
	return date.toUTCString()
}

export function convertContentToHTML(content: Prisma.JsonValue): string {
	if (!content) return ''

	if (typeof content === 'string') {
		return `<p>${escapeXML(content)}</p>`
	}

	return renderEdraContent(content)
}

export function extractTextSummary(content: Prisma.JsonValue, maxLength: number = 300): string {
	if (!content) return ''

	let text = ''

	if (typeof content === 'string') {
		text = content
	} else if (
		typeof content === 'object' &&
		content !== null &&
		'type' in content &&
		content.type === 'doc' &&
		'content' in content &&
		Array.isArray(content.content)
	) {
		const docContent = content as unknown as DocContent
		text =
			docContent.content
				?.filter((node): node is ParagraphNode => node.type === 'paragraph')
				.map((node) => {
					if (node.content && Array.isArray(node.content)) {
						return node.content
							.filter((child): child is TextNode => 'type' in child && child.type === 'text')
							.map((child) => child.text || '')
							.join('')
					}
					return ''
				})
				.filter((t) => t.length > 0)
				.join(' ') || ''
	}

	text = text.replace(/\s+/g, ' ').trim()
	return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}
