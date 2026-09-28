export interface FeedState<T> {
	items: T[]
	offset: number
	hasMore: boolean
	loading: boolean
	loadingAll: boolean
	error: string
}
interface FeedPage<T> {
	items: T[]
	limit: number
	hasMore: boolean
}

// Both infinite scrolling and horizontal mode use this one request owner.
export function createPagedFeed<T>(options: {
	initial: { items: T[]; offset: number; hasMore: boolean }
	key: (item: T) => string | number
	load: (offset: number, limit: number, signal: AbortSignal) => Promise<FeedPage<T>>
	changed: (state: FeedState<T>) => void
}) {
	let state: FeedState<T> = { ...options.initial, loading: false, loadingAll: false, error: '' }
	let pending: Promise<boolean> | undefined
	let abort: AbortController | undefined
	let disposed = false
	let generation = 0
	function update(changes: Partial<FeedState<T>>) {
		state = { ...state, ...changes }
		if (!disposed) options.changed(state)
	}
	function loadMore(limit = 20): Promise<boolean> {
		if (disposed || !state.hasMore) return Promise.resolve(false)
		if (pending) return pending
		const current = generation
		abort = new AbortController()
		update({ loading: true, error: '' })
		pending = (async () => {
			try {
				const page = await options.load(state.offset, limit, abort!.signal)
				if (disposed || current !== generation) return false
				const keys = new Set(state.items.map(options.key))
				const fresh = page.items.filter((item) => {
					const key = options.key(item)
					if (keys.has(key)) return false
					keys.add(key)
					return true
				})
				update({
					items: [...state.items, ...fresh],
					offset: state.offset + page.limit,
					hasMore: page.hasMore && page.items.length > 0
				})
				return true
			} catch (error) {
				if (!disposed && current === generation)
					update({ error: error instanceof Error ? error.message : 'Failed to load more' })
				return false
			} finally {
				if (current === generation) {
					pending = undefined
					update({ loading: false })
				}
			}
		})()
		return pending
	}
	return {
		loadMore,
		async loadAll() {
			if (disposed || state.loadingAll) return
			update({ loadingAll: true })
			try {
				while (!disposed && state.hasMore) if (!(await loadMore(50))) break
			} finally {
				update({ loadingAll: false })
			}
		},
		restore(items: T[], offset: number) {
			generation++
			abort?.abort()
			pending = undefined
			update({ items, offset, loading: false })
		},
		dispose() {
			disposed = true
			generation++
			abort?.abort()
		}
	}
}
