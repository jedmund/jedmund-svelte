import type { Media } from '@prisma/client'
import { mediaRequest, type AlbumSummary, type MediaUsage } from './requests'

export interface DetailsState {
	usage: MediaUsage[]
	albums: AlbumSummary[]
	heartCount?: number
	loadingUsage: boolean
	saving: boolean
}
export const emptyDetails = (): DetailsState => ({
	usage: [],
	albums: [],
	loadingUsage: false,
	saving: false
})
export interface MediaDraft {
	description: string
	isPhotography: boolean
}

export function createDetailsSession(options: {
	onChange: (state: DetailsState) => void
	onSaved: (media: Media) => void | Promise<void>
	onClose: () => void
	getDraft: () => MediaDraft
	request?: typeof mediaRequest
}) {
	const request = options.request ?? mediaRequest
	let active: { media: Media; controller: AbortController } | undefined
	let timer: ReturnType<typeof setTimeout> | undefined
	let state = emptyDetails()
	const publish = () => options.onChange({ ...state })
	function close() {
		clearTimeout(timer)
		active?.controller.abort()
		active = undefined
	}
	async function load(session: NonNullable<typeof active>) {
		const {
			media,
			controller: { signal }
		} = session
		const [usage, albums, hearts] = await Promise.allSettled([
			request<{ usage: MediaUsage[] }>(`/api/media/${media.id}/usage`, signal),
			media.mimeType.startsWith('image/')
				? request<{ albums: AlbumSummary[] }>(`/api/media/${media.id}/albums`, signal)
				: Promise.resolve({ albums: [] }),
			media.isPhotography
				? request<Record<string, number>>(`/api/heart/photos/${media.id}`, signal)
				: Promise.resolve(undefined)
		])
		if (active !== session) return
		state = {
			...state,
			loadingUsage: false,
			usage: usage.status === 'fulfilled' ? usage.value.usage : [],
			albums: albums.status === 'fulfilled' ? albums.value.albums : [],
			heartCount:
				hearts.status === 'fulfilled' && hearts.value
					? Object.values(hearts.value)
							.filter((n) => typeof n === 'number' && Number.isFinite(n))
							.reduce((a, b) => a + b, 0)
					: undefined
		}
		publish()
	}
	async function mutate(method: 'PUT' | 'DELETE', draft?: MediaDraft) {
		const session = active
		if (!session || state.saving) return false
		clearTimeout(timer)
		state.saving = true
		publish()
		try {
			const updated = await request<Media>(
				`/api/media/${session.media.id}`,
				session.controller.signal,
				{
					method,
					...(draft
						? {
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({
									description: draft.description.trim() || null,
									isPhotography: draft.isPhotography
								})
							}
						: {})
				}
			)
			if (active !== session) return false
			if (draft) {
				await options.onSaved(updated)
				if (active !== session) return false
				timer = setTimeout(() => {
					const current = options.getDraft()
					if (
						active === session &&
						current.description === draft.description &&
						current.isPhotography === draft.isPhotography
					)
						options.onClose()
				}, 1500)
			} else options.onClose()
			return true
		} catch (cause) {
			if (active !== session) return false
			throw cause
		} finally {
			if (active === session) {
				state.saving = false
				publish()
			}
		}
	}
	return {
		select(media: Media) {
			close()
			const session = (active = { media, controller: new AbortController() })
			state = { ...emptyDetails(), loadingUsage: true }
			publish()
			void load(session)
		},
		setAlbums(albums: AlbumSummary[]) {
			state.albums = albums
			publish()
		},
		save: (draft: MediaDraft) => mutate('PUT', draft),
		delete: () => mutate('DELETE'),
		close
	}
}
