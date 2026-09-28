import type { Media } from '@prisma/client'
import { loadMediaPage, mediaRequest, type MediaFilters } from './requests'

export interface LibraryState {
	media: Media[]
	selectedIds: Set<number>
	loading: boolean
	error: string
	page: number
	totalPages: number
}
export const emptyLibrary = (): LibraryState => ({
	media: [],
	selectedIds: new Set(),
	loading: false,
	error: '',
	page: 0,
	totalPages: 1
})

/** Owns a modal session. Selection records outlive filters; responses never outlive their query. */
export function createLibrarySession(options: {
	onChange: (state: LibraryState) => void
	load?: typeof loadMediaPage
	get?: (id: number, signal: AbortSignal) => Promise<Media>
}) {
	let state = emptyLibrary()
	let records = new Map<number, Media>()
	let active = false
	let query = 0
	let lifetime = new AbortController()
	let request: AbortController | undefined
	let timer: ReturnType<typeof setTimeout> | undefined
	let filters: MediaFilters
	const load = options.load ?? loadMediaPage
	const get = options.get ?? ((id, signal) => mediaRequest<Media>(`/api/media/${id}`, signal))
	const publish = () => options.onChange({ ...state, selectedIds: new Set(state.selectedIds) })

	function cancelQuery() {
		query++
		clearTimeout(timer)
		request?.abort()
	}
	async function page(number: number) {
		if (!active || state.loading) return
		const generation = query
		const controller = (request = new AbortController())
		state = { ...state, loading: true, error: '' }
		publish()
		try {
			const data = await load({ ...filters }, number, controller.signal)
			if (!active || generation !== query) return
			for (const item of data.media) records.set(item.id, item)
			state = {
				...state,
				media: number === 1 ? data.media : [...state.media, ...data.media],
				page: number,
				totalPages: data.pagination.totalPages
			}
		} catch (cause) {
			if (!active || generation !== query) return
			state.error = cause instanceof Error ? cause.message : 'Failed to load media'
		} finally {
			if (active && generation === query) {
				state.loading = false
				publish()
			}
		}
	}
	return {
		open(ids: number[]) {
			cancelQuery()
			lifetime.abort()
			lifetime = new AbortController()
			active = true
			records = new Map()
			state = { ...emptyLibrary(), selectedIds: new Set(ids) }
			publish()
		},
		search(next: MediaFilters, delay = 0) {
			if (!active) return
			cancelQuery()
			filters = next
			state = { ...state, media: [], page: 0, totalPages: 1, loading: false, error: '' }
			publish()
			timer = setTimeout(() => {
				void page(1)
			}, delay)
		},
		more: () => (state.page < state.totalPages ? page(state.page + 1) : Promise.resolve()),
		toggle(item: Media, single: boolean) {
			if (!active) return
			records.set(item.id, item)
			const ids = single ? new Set<number>() : new Set(state.selectedIds)
			if (!single && ids.has(item.id)) ids.delete(item.id)
			else ids.add(item.id)
			state.selectedIds = ids
			publish()
		},
		async selected(): Promise<Media[] | null> {
			const signal = lifetime.signal
			const ids = [...state.selectedIds]
			const selected = await Promise.all(ids.map((id) => records.get(id) ?? get(id, signal)))
			return active && !signal.aborted ? selected : null
		},
		close() {
			active = false
			cancelQuery()
			lifetime.abort()
		}
	}
}
