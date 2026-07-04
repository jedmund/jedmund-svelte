import type { TiptapNode } from '$lib/types/editor'

export interface HeroMedia {
	type: 'image' | 'video'
	src: string
	alt?: string
	title?: string
	width?: string | number
	height?: string | number
}

const MEDIA_TYPES = new Set(['image', 'video'])

export function extractHeroMedia(content: TiptapNode | null | undefined): HeroMedia | null {
	if (!content || !content.content) return null

	const stack: TiptapNode[] = [...(content.content as TiptapNode[])]

	while (stack.length) {
		const node = stack.shift()!

		if (MEDIA_TYPES.has(node.type) && node.attrs && typeof node.attrs.src === 'string') {
			return {
				type: node.type as 'image' | 'video',
				src: node.attrs.src as string,
				alt: typeof node.attrs.alt === 'string' ? (node.attrs.alt as string) : undefined,
				title: typeof node.attrs.title === 'string' ? (node.attrs.title as string) : undefined,
				width: node.attrs.width as string | number | undefined,
				height: node.attrs.height as string | number | undefined
			}
		}

		if (node.content && Array.isArray(node.content)) {
			stack.unshift(...(node.content as TiptapNode[]))
		}
	}

	return null
}
