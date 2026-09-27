import type { JSONContent } from '@tiptap/core'
// Legacy blocks format (pre-Tiptap) — still in some old posts.
interface BlockContent {
	blocks: Array<{
		type: string
		content?: string | Array<{ content?: string } | string>
		level?: number
		language?: string
		src?: string
		alt?: string
		caption?: string
	}>
}

export function normalizeContent(raw: unknown): JSONContent {
	if (raw && typeof raw === 'object') {
		if ('blocks' in raw) {
			return convertBlocksToTiptap(raw as unknown as BlockContent)
		}
		if ((raw as { type?: string }).type === 'doc') {
			return raw as JSONContent
		}
	}
	return { type: 'doc', content: [] }
}

function convertBlocksToTiptap(blocksContent: BlockContent): JSONContent {
	if (!blocksContent || !blocksContent.blocks) {
		return { type: 'doc', content: [] }
	}

	const tiptapContent = blocksContent.blocks.map((block) => {
		switch (block.type) {
			case 'paragraph':
				return {
					type: 'paragraph',
					content: block.content ? [{ type: 'text', text: block.content }] : []
				}
			case 'heading':
				return {
					type: 'heading',
					attrs: { level: block.level || 1 },
					content: block.content ? [{ type: 'text', text: block.content }] : []
				}
			case 'bulletList':
			case 'ul':
				return {
					type: 'bulletList',
					content: Array.isArray(block.content)
						? block.content.map((item) => ({
								type: 'listItem',
								content: [
									{
										type: 'paragraph',
										content: [
											{
												type: 'text',
												text: (typeof item === 'object' && item.content) || String(item)
											}
										]
									}
								]
							}))
						: []
				}
			case 'orderedList':
			case 'ol':
				return {
					type: 'orderedList',
					content: Array.isArray(block.content)
						? block.content.map((item) => ({
								type: 'listItem',
								content: [
									{
										type: 'paragraph',
										content: [
											{
												type: 'text',
												text: (typeof item === 'object' && item.content) || String(item)
											}
										]
									}
								]
							}))
						: []
				}
			case 'blockquote':
				return {
					type: 'blockquote',
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text: block.content || '' }]
						}
					]
				}
			case 'codeBlock':
			case 'code':
				return {
					type: 'codeBlock',
					attrs: { language: block.language || '' },
					content: [{ type: 'text', text: block.content || '' }]
				}
			case 'image':
				return {
					type: 'image',
					attrs: {
						src: block.src || '',
						alt: block.alt || '',
						title: block.caption || ''
					}
				}
			case 'hr':
			case 'horizontalRule':
				return { type: 'horizontalRule' }
			default:
				return {
					type: 'paragraph',
					content: block.content ? [{ type: 'text', text: block.content }] : []
				}
		}
	})

	return {
		type: 'doc',
		content: tiptapContent as JSONContent[]
	}
}
