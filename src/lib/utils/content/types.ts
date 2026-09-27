// Content node types for rendering
export interface ContentNode {
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
export interface Mark {
	type: string
	attrs?: Record<string, unknown>
}
