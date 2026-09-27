export interface SuggestionState<T> {
	results: T[]
	loading: boolean
	error: string
}

/** Debounce and cancellation share a lifetime; a late provider cannot restore old results. */
export function createSuggestionSearch<T>(
	search: (query: string, signal: AbortSignal) => Promise<T[]>,
	changed: (state: SuggestionState<T>) => void,
	delay = 300
) {
	let timer: ReturnType<typeof setTimeout> | undefined
	let controller: AbortController | undefined
	let revision = 0

	function cancel() {
		revision++
		clearTimeout(timer)
		controller?.abort()
	}

	return {
		query(query: string) {
			cancel()
			changed({ results: [], loading: query.length >= 2, error: '' })
			if (query.length < 2) return
			const current = revision
			timer = setTimeout(async () => {
				controller = new AbortController()
				try {
					const results = await search(query, controller.signal)
					if (current === revision) changed({ results, loading: false, error: '' })
				} catch (error) {
					if (current === revision)
						changed({
							results: [],
							loading: false,
							error: error instanceof Error ? error.message : 'Search failed'
						})
				}
			}, delay)
		},
		clear() {
			cancel()
			changed({ results: [], loading: false, error: '' })
		},
		dispose: cancel
	}
}
