import { writable } from 'svelte/store'

interface PaneState {
	activePane: string | null
}

function createPaneManager() {
	const { subscribe, set, update } = writable<PaneState>({
		activePane: null
	})

	return {
		subscribe,
		open: (paneId: string) => {
			update((state) => ({
				...state,
				activePane: paneId
			}))
		},
		close: () => {
			update((state) => ({
				...state,
				activePane: null
			}))
		},
		isActive: (paneId: string, state: PaneState) => {
			return state.activePane === paneId
		}
	}
}

export const paneManager = createPaneManager()
