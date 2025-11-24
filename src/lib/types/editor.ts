import type { JSONContent } from '@tiptap/core'

export type EditorData = JSONContent

export interface EditorProps {
	data?: EditorData
	readOnly?: boolean
	placeholder?: string
	onChange?: (data: EditorData) => void
}

// Legacy EditorJS format support (for migration)
export interface EditorBlock {
	id?: string
	type: string
	data: {
		text?: string
		level?: number
		style?: string
		items?: string[]
		caption?: string
		url?: string
		[key: string]: unknown
	}
}

export interface EditorSaveData {
	time: number
	blocks: EditorBlock[]
	version: string
}

// Tiptap/Edra content nodes
export interface TiptapNode {
	type: string
	attrs?: Record<string, unknown>
	content?: TiptapNode[]
	marks?: Array<{
		type: string
		attrs?: Record<string, unknown>
	}>
	text?: string
}
