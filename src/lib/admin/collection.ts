/** Keeps collection reads and per-resource mutations within their owning page lifetime. */
export function createCollectionSession<T>(
	changed: (items: T[], loading: boolean, error: string) => void,
	initial: T[] = []
) {
	let items = initial
	let controller: AbortController | undefined
	let generation = 0
	let disposed = false
	const mutations = new Map<string | number, AbortController>()

	return {
		invalidate() {
			generation++
			controller?.abort()
		},
		async load(fetchItems: (signal: AbortSignal) => Promise<T[]>) {
			if (disposed) return
			const current = ++generation
			controller?.abort()
			controller = new AbortController()
			changed(items, true, '')
			try {
				const next = await fetchItems(controller.signal)
				if (disposed || current !== generation) return
				items = next
				changed(items, false, '')
			} catch (error) {
				if (!disposed && current === generation)
					changed(items, false, error instanceof Error ? error.message : 'Unable to load items')
			}
		},
		async mutate(key: string | number, operation: (signal: AbortSignal) => Promise<unknown>) {
			if (disposed || mutations.has(key)) return false
			const request = new AbortController()
			mutations.set(key, request)
			try {
				await operation(request.signal)
				return !disposed
			} catch (error) {
				if (disposed) return false
				throw error
			} finally {
				mutations.delete(key)
			}
		},
		dispose() {
			disposed = true
			generation++
			controller?.abort()
			for (const request of mutations.values()) request.abort()
		}
	}
}
