import { searchAppleMusic } from './debug-requests'

export interface AppleSearchState {
	open: boolean
	searching: boolean
	results: unknown
	error: string | null
	responseTime: number
}

export function createAppleSearch(
	publish: (state: AppleSearchState) => void,
	search = searchAppleMusic
) {
	let state: AppleSearchState = {
		open: false,
		searching: false,
		results: null,
		error: null,
		responseTime: 0
	}
	let controller: AbortController | null = null
	let generation = 0
	let disposed = false
	function cancel() {
		generation++
		controller?.abort()
		controller = null
	}
	function update(values: Partial<AppleSearchState>) {
		state = { ...state, ...values }
		if (!disposed) publish(state)
	}
	return {
		open() {
			if (disposed) return
			cancel()
			update({ open: true, searching: false, results: null, error: null, responseTime: 0 })
		},
		close() {
			cancel()
			update({ open: false, searching: false })
		},
		async search(query: string, storefront: string) {
			if (disposed || !state.open) return
			cancel()
			if (!query.trim()) {
				update({ searching: false, error: 'Please enter a search query' })
				return
			}
			const request = generation
			controller = new AbortController()
			const signal = controller.signal
			update({ searching: true, error: null, results: null, responseTime: 0 })
			const started = performance.now()
			try {
				const results = await search(query, storefront, signal)
				if (request === generation && !disposed)
					update({ results, responseTime: Math.round(performance.now() - started) })
			} catch (error) {
				if (request === generation && !disposed)
					update({
						error: error instanceof Error ? error.message : 'Unknown error occurred',
						results: null
					})
			} finally {
				if (request === generation && !disposed) {
					controller = null
					update({ searching: false })
				}
			}
		},
		dispose() {
			disposed = true
			cancel()
		}
	}
}
