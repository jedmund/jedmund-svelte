import { onDestroy, onMount } from 'svelte'
import { replaceState } from '$app/navigation'
import { api } from '$lib/admin/api'
import { toast } from '$lib/stores/toast'
import type { Album, Media } from '@prisma/client'
import { albumFormFields, albumFormSchema, albumPayload } from './album-form'
import { createSaveQueue } from './save-session'
import { useFormLifecycle } from './useFormLifecycle.svelte'

interface Props {
	album?: Album | null
	mode: 'create' | 'edit'
}

export function createAlbumForm(options: Props) {
	let album = $state(options.album ?? null)
	let mode = $state(options.mode)
	const formData = $state(albumFormFields(options.album ?? null))
	let savedSnapshot = $state(JSON.stringify(formData))
	let isSaving = $state(false)
	let showBulkAlbumModal = $state(false)
	let albumMedia = $state<Array<{ media: Media; displayOrder: number }>>([])
	let activeTab = $state('metadata')
	let pendingMediaIds = $state<number[]>([])
	let heartCount = $state<number | undefined>()
	const lifetime = new AbortController()
	let mediaRequest = 0
	const queue = createSaveQueue()
	const lifecycle = useFormLifecycle({
		isDirty: () => JSON.stringify(formData) !== savedSnapshot || pendingMediaIds.length > 0,
		canAutoSave: () => false,
		flush: async () => {},
		save: handleSave
	})
	onDestroy(() => lifetime.abort())
	onMount(() => {
		if (!album) return
		void loadAlbumMedia()
		if (album.slug) {
			api
				.get<Record<string, number>>(`/api/heart/albums/${album.slug}`, { signal: lifetime.signal })
				.then((counts) => {
					heartCount = Object.values(counts).reduce((sum, count) => sum + count, 0)
				})
				.catch(() => {})
		}
	})
	$effect(() => {
		if (formData.title && mode === 'create') {
			formData.slug = formData.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
		}
	})

	async function loadAlbumMedia() {
		if (!album) return
		const request = ++mediaRequest
		try {
			const data = await api.get<{ media?: typeof albumMedia }>(`/api/albums/${album.id}`, {
				signal: lifetime.signal
			})
			if (!lifetime.signal.aborted && request === mediaRequest) albumMedia = data.media || []
		} catch (error) {
			if (!lifetime.signal.aborted) console.error('Failed to load album media:', error)
		}
	}

	function handleSave() {
		return queue.run(async () => {
			if (lifetime.signal.aborted) return
			if (!albumFormSchema.safeParse(formData).success) {
				toast.error('Please fix the validation errors')
				return
			}
			isSaving = true
			const submittingSnapshot = JSON.stringify(formData)
			const submittedMediaIds = [...pendingMediaIds]
			const loadingToastId = toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} album...`)
			try {
				if (!album || submittingSnapshot !== savedSnapshot) {
					const payload = albumPayload(formData, album?.updatedAt)
					const savedAlbum = album
						? await api.put<Album>(`/api/albums/${album.id}`, payload)
						: await api.post<Album>('/api/albums', payload)
					album = savedAlbum
					// Acknowledge the submitted snapshot, leaving later edits in the live fields untouched.
					savedSnapshot = submittingSnapshot
					if (mode === 'create') {
						mode = 'edit'
						if (!lifetime.signal.aborted) replaceState(`/admin/albums/${savedAlbum.id}/edit`, {})
					}
				}
				if (submittedMediaIds.length > 0 && album) {
					await api.post(`/api/albums/${album.id}/media`, { mediaIds: submittedMediaIds })
					pendingMediaIds = pendingMediaIds.filter((id) => !submittedMediaIds.includes(id))
				}
				await loadAlbumMedia()
				toast.success('Album saved successfully!')
			} catch (error) {
				// Successful creation remains committed. Failed photo additions stay pending for Save to retry.
				toast.error(error instanceof Error ? error.message : 'Failed to save album')
			} finally {
				toast.dismiss(loadingToastId)
				isSaving = false
			}
		})
	}

	return {
		formData,
		lifecycle,
		get album() {
			return album
		},
		get mode() {
			return mode
		},
		get isSaving() {
			return isSaving
		},
		get albumMedia() {
			return albumMedia
		},
		get pendingMediaIds() {
			return pendingMediaIds
		},
		get heartCount() {
			return heartCount
		},
		get existingMediaIds() {
			return albumMedia.map((item) => item.media.id)
		},
		get showBulkAlbumModal() {
			return showBulkAlbumModal
		},
		set showBulkAlbumModal(value: boolean) {
			showBulkAlbumModal = value
		},
		get activeTab() {
			return activeTab
		},
		set activeTab(value: string) {
			activeTab = value
		},
		tabOptions: [
			{ value: 'metadata', label: 'Metadata' },
			{ value: 'content', label: 'Content' }
		],
		handleSave,
		handleBulkAlbumSave: loadAlbumMedia,
		handlePhotoSelection(media: Media | Media[]) {
			pendingMediaIds = (Array.isArray(media) ? media : [media]).map((item) => item.id)
		}
	}
}
