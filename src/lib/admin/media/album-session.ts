import { changeAlbumMembership, createAlbum, loadAlbums, type AlbumSummary } from './requests'
import { createMembershipSession } from './membership-session'

export interface AlbumState {
	albums: AlbumSummary[]
	selected: Set<number>
	loading: boolean
	saving: boolean
	error: string
}
export const emptyAlbums = (): AlbumState => ({
	albums: [],
	selected: new Set(),
	loading: false,
	saving: false,
	error: ''
})

export function createAlbumSession(options: {
	onChange: (state: AlbumState) => void
	load?: typeof loadAlbums
	create?: typeof createAlbum
	change?: typeof changeAlbumMembership
}) {
	let active:
		| { controller: AbortController; membership: ReturnType<typeof createMembershipSession> }
		| undefined
	let state = emptyAlbums()
	const publish = () => options.onChange({ ...state, selected: new Set(state.selected) })
	function close() {
		active?.controller.abort()
		active?.membership.close()
		active = undefined
	}
	return {
		async open(mediaId: number | undefined, current: AlbumSummary[]) {
			close()
			const session = (active = {
				controller: new AbortController(),
				membership: createMembershipSession(
					current.map((a) => a.id),
					(id, selected, signal) => {
						if (mediaId === undefined) throw new Error('Choose media before updating albums')
						return (options.change ?? changeAlbumMembership)(id, [mediaId], selected, signal)
					}
				)
			})
			state = {
				...emptyAlbums(),
				albums: current,
				selected: new Set(current.map((a) => a.id)),
				loading: true
			}
			publish()
			try {
				const albums = await (options.load ?? loadAlbums)(session.controller.signal)
				if (active !== session) return
				state.albums = [...new Map([...state.albums, ...albums].map((a) => [a.id, a])).values()]
			} catch (cause) {
				if (active === session)
					state.error = cause instanceof Error ? cause.message : 'Failed to load albums'
			} finally {
				if (active === session) {
					state.loading = false
					publish()
				}
			}
		},
		toggle(id: number) {
			if (state.saving) return
			if (state.selected.has(id)) state.selected.delete(id)
			else state.selected.add(id)
			publish()
		},
		async create(title: string, slug: string) {
			const session = active
			if (!session || state.saving) return false
			state.saving = true
			state.error = ''
			publish()
			try {
				const album = await (options.create ?? createAlbum)(title, slug, session.controller.signal)
				if (active !== session) return false
				state.albums = [album, ...state.albums]
				state.selected.add(album.id)
				return true
			} catch (cause) {
				if (active === session)
					state.error = cause instanceof Error ? cause.message : 'Failed to create album'
				return false
			} finally {
				if (active === session) {
					state.saving = false
					publish()
				}
			}
		},
		async save(onSaved?: (albums: AlbumSummary[]) => void | Promise<void>) {
			const session = active
			if (!session || state.saving) return null
			state.saving = true
			state.error = ''
			publish()
			try {
				if (!(await session.membership.save(state.selected)) || active !== session) return null
				const albums = state.albums.filter((a) => state.selected.has(a.id))
				await onSaved?.(albums)
				return active === session ? albums : null
			} catch (cause) {
				if (active === session)
					state.error = cause instanceof Error ? cause.message : 'Failed to update albums'
				return null
			} finally {
				if (active === session) {
					state.saving = false
					publish()
				}
			}
		},
		close
	}
}
