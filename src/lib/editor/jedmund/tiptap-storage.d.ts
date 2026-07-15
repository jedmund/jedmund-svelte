import type { Range } from '@tiptap/core'

declare module '@tiptap/core' {
	interface Storage {
		imageModal: {
			autoOpen?: boolean
			placeholderPos?: number
		}
		searchAndReplace: {
			searchTerm: string
			replaceTerm: string
			results: Range[]
			lastSearchTerm: string
			caseSensitive: boolean
			lastCaseSensitive: boolean
			resultIndex: number
			lastResultIndex: number
		}
		slashCommand: {
			rect: {
				width: number
				height: number
				left: number
				top: number
				right: number
				bottom: number
			}
			popupElement?: HTMLElement | null
			popupCleanup?: (() => void) | null
		}
	}
}

export {}
