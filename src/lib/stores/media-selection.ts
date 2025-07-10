import { writable } from 'svelte/store'
import type { Media } from '@prisma/client'

interface MediaSelectionState {
	isOpen: boolean
	mode: 'single' | 'multiple'
	fileType?: 'image' | 'video' | 'all'
	albumId?: number
	onSelect?: (media: Media | Media[]) => void
	onClose?: () => void
}

function createMediaSelectionStore() {
	const { subscribe, set, update } = writable<MediaSelectionState>({
		isOpen: false,
		mode: 'single',
		fileType: 'all'
	})

	return {
		subscribe,
		open: (options: Partial<MediaSelectionState>) => {
			update((state) => ({
				...state,
				...options,
				isOpen: true
			}))
		},
		close: () => {
			update((state) => ({
				...state,
				isOpen: false,
				onSelect: undefined,
				onClose: undefined
			}))
		}
	}
}

export const mediaSelectionStore = createMediaSelectionStore()
