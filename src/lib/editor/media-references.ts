interface RichTextNode {
	type?: string
	attrs?: Record<string, unknown>
	content?: RichTextNode[]
}

const mediaId = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
	if (typeof value === 'string' && /^\d+$/.test(value)) return Number.parseInt(value, 10)
	return null
}

const mediaIdFromUrl = (value: unknown): number | null => {
	if (typeof value !== 'string') return null
	const match = value.match(/\/api\/media\/(\d+)/)
	return match ? Number.parseInt(match[1]!, 10) : null
}

/** Extracts all app-owned media references from persisted TipTap JSON. */
export const extractRichTextMediaIds = (content: unknown): number[] => {
	if (!content || typeof content !== 'object') return []

	const ids: number[] = []
	const add = (value: number | null) => {
		if (value !== null) ids.push(value)
	}

	const visit = (node: RichTextNode): void => {
		if (['image', 'audio', 'video'].includes(node.type ?? '')) {
			add(mediaId(node.attrs?.mediaId) ?? mediaIdFromUrl(node.attrs?.src))
		}

		if (node.type === 'gallery' && Array.isArray(node.attrs?.images)) {
			for (const image of node.attrs.images) {
				if (image && typeof image === 'object') {
					add(mediaId((image as Record<string, unknown>).id))
				}
			}
		}

		if (node.type === 'urlEmbed') {
			add(mediaId(node.attrs?.imageMediaId))
			add(mediaId(node.attrs?.faviconMediaId))
		}

		for (const child of node.content ?? []) visit(child)
	}

	visit(content as RichTextNode)
	return [...new Set(ids)]
}
