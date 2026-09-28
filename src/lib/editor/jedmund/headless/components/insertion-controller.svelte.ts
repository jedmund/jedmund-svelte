import { uploadInsertionMedia } from './insertion-upload'
import { extractCoordinatesFromUrl } from './insertion-location'
import type { Editor } from '@tiptap/core'
import type { Media } from '@prisma/client'
import type { LocationAttributes } from '../../extensions/geolocation/GeolocationExtended.js'
import { mediaSelectionStore } from '$lib/stores/media-selection'

export type ContentType = 'image' | 'video' | 'audio' | 'gallery' | 'location'
export type ActionType = 'upload' | 'embed' | 'gallery' | 'search'
export function createInsertionController({
	editor,
	contentType,
	onClose,
	deleteNode,
	albumId,
	initialUrl,
	initialLocation,
	onLocationSelect
}: {
	editor: Editor
	contentType: ContentType
	onClose: () => void
	deleteNode?: () => void
	albumId?: number
	initialUrl?: string
	initialLocation?: LocationAttributes
	onLocationSelect?: (location: LocationAttributes) => void
}) {
	const uploadAbort = new AbortController()
	// Set default action based on content type
	function getDefaultAction(): ActionType {
		if (initialUrl) return 'embed'
		if (contentType === 'location') return 'search'
		if (contentType === 'gallery') return 'gallery'
		if (contentType === 'image') return 'gallery'
		return 'upload'
	}

	let selectedAction = $state<ActionType>(getDefaultAction())
	let embedUrl = $state(initialUrl ?? '')
	let isUploading = $state(false)
	let fileInput = $state<HTMLInputElement>()
	let isOpen = $state(true)

	// Location form fields
	let locationTitle = $state(initialLocation?.title ?? '')
	let locationDescription = $state(initialLocation?.description ?? '')
	let locationLat = $state<string | number>(initialLocation?.latitude ?? '')
	let locationLng = $state<string | number>(initialLocation?.longitude ?? '')
	let locationMarkerColor = $state(initialLocation?.markerColor ?? '#ef4444')
	let locationZoom = $state(initialLocation?.zoom ?? 15)

	function handleUpload() {
		if (!fileInput) return

		// Set accept attribute based on type
		switch (contentType) {
			case 'image':
				fileInput.accept = 'image/*'
				break
			case 'video':
				fileInput.accept = 'video/*'
				break
			case 'audio':
				fileInput.accept = 'audio/*'
				break
		}

		fileInput.click()
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement
		const files = input.files
		if (!files || files.length === 0) return

		isUploading = true

		try {
			const media = await uploadInsertionMedia(files[0], contentType, albumId, uploadAbort.signal)
			if (!uploadAbort.signal.aborted && !editor.isDestroyed) insertContent(media)
		} catch (error) {
			if (uploadAbort.signal.aborted) return
			console.error('Error uploading file:', error)
			alert('Failed to upload file. Please try again.')
		} finally {
			isUploading = false
			input.value = ''
		}
	}

	function handleEmbed() {
		if (!embedUrl.trim()) return

		switch (contentType) {
			case 'image':
				editor
					.chain()
					.focus()
					.insertContent([
						{
							type: 'image',
							attrs: { src: embedUrl }
						},
						{
							type: 'paragraph'
						}
					])
					.run()
				break
			case 'video':
				editor.chain().focus().setVideo({ src: embedUrl }).run()
				break
			case 'audio':
				editor.chain().focus().setAudio({ src: embedUrl }).run()
				break
			case 'location': {
				// For location, try to extract coordinates from Google Maps URL
				const coords = extractCoordinatesFromUrl(embedUrl)
				if (coords) {
					locationLat = coords.lat
					locationLng = coords.lng
					handleLocationInsert()
					return
				} else {
					alert('Please enter a valid Google Maps URL')
					return
				}
			}
		}

		deleteNode?.()
		onClose()
	}

	function handleGallerySelect() {
		const fileType = contentType === 'gallery' ? 'image' : contentType
		const mode = contentType === 'gallery' ? 'multiple' : 'single'
		// Map fileType to what the store accepts (audio -> all)
		const storeFileType: 'image' | 'video' | 'all' | undefined =
			fileType === 'audio'
				? 'all'
				: fileType === 'image' || fileType === 'video'
					? fileType
					: undefined

		// Close the pane first to prevent z-index issues
		handlePaneClose()

		// Both state updates are applied in the same render; no delayed work survives the pane.
		mediaSelectionStore.open({
			mode,
			fileType: storeFileType,
			albumId,
			onSelect: (media: Media | Media[]) => {
				if (contentType === 'gallery') {
					insertGallery(media as Media[])
				} else {
					insertContent(media as Media)
				}
			},
			onClose: () => {
				mediaSelectionStore.close()
			}
		})
	}

	function insertContent(media: Media) {
		switch (contentType) {
			case 'image': {
				const displayWidth = media.width && media.width > 600 ? 600 : media.width
				editor
					.chain()
					.focus()
					.insertContent([
						{
							type: 'image',
							attrs: {
								src: media.url,
								alt: media.description || '',
								title: '',
								width: displayWidth,
								height: media.height,
								align: 'center',
								mediaId: media.id?.toString()
							}
						},
						{
							type: 'paragraph'
						}
					])
					.run()
				break
			}
			case 'video':
				editor.chain().focus().setVideo({ src: media.url }).run()
				break
			case 'audio':
				editor.chain().focus().setAudio({ src: media.url }).run()
				break
		}

		deleteNode?.()
		onClose()
	}

	function insertGallery(mediaArray: Media[]) {
		if (mediaArray.length > 0) {
			const galleryImages = mediaArray.map((m) => ({
				id: m.id,
				url: m.url,
				alt: m.description || '',
				title: ''
			}))

			editor.chain().focus().setGallery({ images: galleryImages }).run()
		}

		deleteNode?.()
		onClose()
	}

	function handleLocationInsert() {
		const lat = Number(locationLat)
		const lng = Number(locationLng)
		if (
			locationLat === '' ||
			locationLng === '' ||
			!Number.isFinite(lat) ||
			!Number.isFinite(lng) ||
			Math.abs(lat) > 90 ||
			Math.abs(lng) > 180
		) {
			alert('Please enter valid coordinates')
			return
		}
		const location: LocationAttributes = {
			latitude: lat,
			longitude: lng,
			title: locationTitle,
			description: locationDescription,
			markerColor: locationMarkerColor,
			zoom: locationZoom
		}
		if (onLocationSelect) onLocationSelect(location)
		else {
			editor.chain().focus().insertContent({ type: 'geolocation', attrs: location }).run()
			deleteNode?.()
		}
		onClose()
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && embedUrl.trim()) {
			handleEmbed()
		}
	}

	function handlePaneClose() {
		isOpen = false
		onClose()
	}

	return {
		get selectedAction() {
			return selectedAction
		},
		set selectedAction(value: typeof selectedAction) {
			selectedAction = value
		},
		get embedUrl() {
			return embedUrl
		},
		set embedUrl(value: typeof embedUrl) {
			embedUrl = value
		},
		get isUploading() {
			return isUploading
		},
		set isUploading(value: typeof isUploading) {
			isUploading = value
		},
		get fileInput() {
			return fileInput
		},
		set fileInput(value: typeof fileInput) {
			fileInput = value
		},
		get isOpen() {
			return isOpen
		},
		set isOpen(value: typeof isOpen) {
			isOpen = value
		},
		get locationTitle() {
			return locationTitle
		},
		set locationTitle(value: typeof locationTitle) {
			locationTitle = value
		},
		get locationDescription() {
			return locationDescription
		},
		set locationDescription(value: typeof locationDescription) {
			locationDescription = value
		},
		get locationLat() {
			return locationLat
		},
		set locationLat(value: typeof locationLat) {
			locationLat = value
		},
		get locationLng() {
			return locationLng
		},
		set locationLng(value: typeof locationLng) {
			locationLng = value
		},
		get locationMarkerColor() {
			return locationMarkerColor
		},
		set locationMarkerColor(value: typeof locationMarkerColor) {
			locationMarkerColor = value
		},
		get locationZoom() {
			return locationZoom
		},
		set locationZoom(value: typeof locationZoom) {
			locationZoom = value
		},
		handleUpload,
		handleFileUpload,
		handleEmbed,
		handleGallerySelect,
		handleLocationInsert,
		handleKeydown,
		handlePaneClose,
		dispose() {
			uploadAbort.abort()
		}
	}
}
