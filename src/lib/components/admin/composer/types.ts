import type { JSONContent } from '@tiptap/core'

export type ComposerVariant = 'full' | 'inline' | 'minimal'

export interface ComposerFeatures {
	imageUpload?: boolean
	mediaLibrary?: boolean
	urlEmbed?: boolean
	tables?: boolean
	codeBlocks?: boolean
	bubbleMenu?: boolean
	toolbar?: boolean
}

export interface ComposerProps {
	variant?: ComposerVariant
	data?: JSONContent
	onChange?: (content: JSONContent) => void
	onCharacterCount?: (count: number) => void
	placeholder?: string
	minHeight?: number
	autofocus?: boolean
	editable?: boolean
	class?: string
	showToolbar?: boolean
	showSlashCommands?: boolean
	albumId?: number
	features?: ComposerFeatures
}

export interface DropdownPosition {
	top: number
	left: number
}

import type { Media } from '@prisma/client'

export interface MediaSelectionOptions {
	mode: 'single' | 'multiple'
	fileType?: 'image' | 'video' | 'audio' | 'all'
	albumId?: number
	onSelect: (media: Media | Media[]) => void
	onClose: () => void
}
