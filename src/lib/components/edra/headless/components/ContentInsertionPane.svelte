<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import type { Media } from '@prisma/client'
	import { onMount, onDestroy } from 'svelte'
	import Image from 'lucide-svelte/icons/image'
	import Video from 'lucide-svelte/icons/video'
	import AudioLines from 'lucide-svelte/icons/audio-lines'
	import Grid3x3 from 'lucide-svelte/icons/grid-3x3'
	import MapPin from 'lucide-svelte/icons/map-pin'
	import Upload from 'lucide-svelte/icons/upload'
	import Link from 'lucide-svelte/icons/link'
	import Images from 'lucide-svelte/icons/images'
	import Search from 'lucide-svelte/icons/search'
	import X from 'lucide-svelte/icons/x'
	import { mediaSelectionStore } from '$lib/stores/media-selection'

	interface Props {
		editor: Editor
		position: { x: number; y: number }
		onClose: () => void
		deleteNode?: () => void
		albumId?: number
	}

	let { editor, position, onClose, deleteNode, albumId }: Props = $props()

	type ContentType = 'image' | 'video' | 'audio' | 'gallery' | 'location'
	type ActionType = 'upload' | 'embed' | 'gallery' | 'search'

	let selectedType = $state<ContentType>('image')
	let embedUrl = $state('')
	let searchQuery = $state('')
	let isUploading = $state(false)
	let fileInput: HTMLInputElement

	const contentTypes = [
		{ type: 'image' as ContentType, icon: Image, label: 'Image' },
		{ type: 'video' as ContentType, icon: Video, label: 'Video' },
		{ type: 'audio' as ContentType, icon: AudioLines, label: 'Audio' },
		{ type: 'gallery' as ContentType, icon: Grid3x3, label: 'Gallery' },
		{ type: 'location' as ContentType, icon: MapPin, label: 'Location' }
	]

	const availableActions = $derived(() => {
		switch (selectedType) {
			case 'image':
			case 'video':
			case 'audio':
				return [
					{ type: 'upload' as ActionType, icon: Upload, label: 'Upload' },
					{ type: 'embed' as ActionType, icon: Link, label: 'Embed link' },
					{ type: 'gallery' as ActionType, icon: Images, label: 'Choose from gallery' }
				]
			case 'gallery':
				return [{ type: 'gallery' as ActionType, icon: Images, label: 'Choose images from gallery' }]
			case 'location':
				return [
					{ type: 'search' as ActionType, icon: Search, label: 'Search' },
					{ type: 'embed' as ActionType, icon: Link, label: 'Embed link' }
				]
			default:
				return []
		}
	})

	function handleTypeSelect(type: ContentType) {
		selectedType = type
		embedUrl = ''
		searchQuery = ''
	}

	function handleUpload() {
		if (!fileInput) return
		
		// Set accept attribute based on type
		switch (selectedType) {
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
			const file = files[0]
			const formData = new FormData()
			formData.append('file', file)
			formData.append('type', selectedType)

			if (albumId) {
				formData.append('albumId', albumId.toString())
			}

			const auth = localStorage.getItem('admin_auth')
			const headers: Record<string, string> = {}
			if (auth) {
				headers.Authorization = `Basic ${auth}`
			}

			const response = await fetch('/api/media/upload', {
				method: 'POST',
				headers,
				body: formData
			})

			if (response.ok) {
				const media = await response.json()
				insertContent(media)
			} else {
				console.error('Failed to upload file:', response.status)
				alert('Failed to upload file. Please try again.')
			}
		} catch (error) {
			console.error('Error uploading file:', error)
			alert('Failed to upload file. Please try again.')
		} finally {
			isUploading = false
			input.value = ''
		}
	}

	function handleEmbed() {
		if (!embedUrl.trim()) return

		switch (selectedType) {
			case 'image':
				editor.chain().focus().setImage({ src: embedUrl }).run()
				break
			case 'video':
				editor.chain().focus().setVideo(embedUrl).run()
				break
			case 'audio':
				editor.chain().focus().setAudio(embedUrl).run()
				break
			case 'location':
				// For location, try to extract coordinates from Google Maps URL
				const coords = extractCoordinatesFromUrl(embedUrl)
				if (coords) {
					editor.chain().focus().insertContent({
						type: 'geolocation',
						attrs: {
							latitude: coords.lat,
							longitude: coords.lng,
							title: 'Location',
							description: ''
						}
					}).run()
				} else {
					alert('Please enter a valid Google Maps URL')
					return
				}
				break
		}

		deleteNode?.()
		onClose()
	}

	function handleGallerySelect() {
		const fileType = selectedType === 'gallery' ? 'image' : selectedType
		const mode = selectedType === 'gallery' ? 'multiple' : 'single'

		mediaSelectionStore.open({
			mode,
			fileType: fileType as 'image' | 'video' | 'audio',
			albumId,
			onSelect: (media: Media | Media[]) => {
				if (selectedType === 'gallery') {
					insertGallery(media as Media[])
				} else {
					insertContent(media as Media)
				}
			},
			onClose: () => {
				mediaSelectionStore.close()
				onClose()
			}
		})
	}

	function insertContent(media: Media) {
		switch (selectedType) {
			case 'image':
				const displayWidth = media.width && media.width > 600 ? 600 : media.width
				editor.chain().focus().insertContent({
					type: 'image',
					attrs: {
						src: media.url,
						alt: media.altText || '',
						title: media.description || '',
						width: displayWidth,
						height: media.height,
						align: 'center',
						mediaId: media.id?.toString()
					}
				}).run()
				break
			case 'video':
				editor.chain().focus().setVideo(media.url).run()
				break
			case 'audio':
				editor.chain().focus().setAudio(media.url).run()
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
				alt: m.altText || '',
				title: m.description || ''
			}))

			editor.chain().focus().setGallery({ images: galleryImages }).run()
		}

		deleteNode?.()
		onClose()
	}

	function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
		// Extract from Google Maps URL patterns
		const patterns = [
			/@(-?\d+\.\d+),(-?\d+\.\d+)/,  // @lat,lng format
			/ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ll=lat,lng format
			/q=(-?\d+\.\d+),(-?\d+\.\d+)/   // q=lat,lng format
		]

		for (const pattern of patterns) {
			const match = url.match(pattern)
			if (match) {
				return {
					lat: parseFloat(match[1]),
					lng: parseFloat(match[2])
				}
			}
		}

		return null
	}

	function handleLocationSearch() {
		// This would integrate with a geocoding API
		// For now, just show a message
		alert('Location search coming soon! For now, paste a Google Maps link.')
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose()
		} else if (e.key === 'Enter' && embedUrl.trim()) {
			handleEmbed()
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.content-insertion-pane')) {
			onClose()
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside)
		document.addEventListener('keydown', handleKeydown)
	})

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside)
		document.removeEventListener('keydown', handleKeydown)
	})
</script>

<div 
	class="content-insertion-pane" 
	style="top: {position.y}px; left: {position.x}px;"
>
	<div class="pane-header">
		<div class="content-types">
			{#each contentTypes as contentType}
				<button
					class="content-type-btn"
					class:active={selectedType === contentType.type}
					onclick={() => handleTypeSelect(contentType.type)}
				>
					<svelte:component this={contentType.icon} size={16} />
					<span>{contentType.label}</span>
				</button>
			{/each}
		</div>
		<button class="close-btn" onclick={onClose}>
			<X size={16} />
		</button>
	</div>

	<div class="pane-content">
		{#if selectedType === 'location' && availableActions()[0]?.type === 'search'}
			<div class="search-section">
				<input
					bind:value={searchQuery}
					placeholder="Search for a location..."
					class="search-input"
				/>
				<button class="search-btn" onclick={handleLocationSearch}>
					<Search size={16} />
					Search
				</button>
			</div>
			<div class="divider">or</div>
		{/if}

		{#if availableActions().some(a => a.type === 'embed')}
			<div class="embed-section">
				<input
					bind:value={embedUrl}
					placeholder={selectedType === 'location' ? 'Paste Google Maps link...' : `Paste ${selectedType} URL...`}
					class="embed-input"
				/>
				<button 
					class="embed-btn" 
					onclick={handleEmbed}
					disabled={!embedUrl.trim()}
				>
					Embed
				</button>
			</div>
		{/if}

		{#if availableActions().length > 1 && availableActions().some(a => a.type !== 'embed')}
			<div class="divider">or</div>
		{/if}

		<div class="action-buttons">
			{#each availableActions().filter(a => a.type !== 'embed') as action}
				<button
					class="action-btn"
					onclick={() => {
						if (action.type === 'upload') handleUpload()
						else if (action.type === 'gallery') handleGallerySelect()
						else if (action.type === 'search') handleLocationSearch()
					}}
					disabled={isUploading}
				>
					<svelte:component this={action.icon} size={20} />
					<span>{action.label}</span>
				</button>
			{/each}
		</div>

		{#if isUploading}
			<div class="uploading-overlay">
				<div class="spinner"></div>
				<span>Uploading...</span>
			</div>
		{/if}
	</div>

	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		onchange={handleFileUpload}
		style="display: none;"
	/>
</div>

<style lang="scss">
	@import '$styles/variables';

	.content-insertion-pane {
		position: fixed;
		background: $white;
		border: 1px solid $gray-85;
		border-radius: $corner-radius;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		width: 400px;
		z-index: $z-index-modal;
		overflow: hidden;
	}

	.pane-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-2x;
		border-bottom: 1px solid $gray-90;
		background: $gray-98;
	}

	.content-types {
		display: flex;
		gap: $unit-half;
	}

	.content-type-btn {
		display: flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit-half $unit-2x;
		border: none;
		border-radius: $corner-radius-sm;
		background: transparent;
		color: $gray-40;
		font-size: $font-size-extra-small;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: $gray-95;
			color: $gray-20;
		}

		&.active {
			background: $gray-90;
			color: $gray-10;
		}

		span {
			@media (max-width: 480px) {
				display: none;
			}
		}
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: $unit-3x;
		height: $unit-3x;
		padding: 0;
		border: none;
		border-radius: $corner-radius-xs;
		background: transparent;
		color: $gray-50;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: $gray-90;
			color: $gray-20;
		}
	}

	.pane-content {
		padding: $unit-3x;
		position: relative;
	}

	.search-section,
	.embed-section {
		display: flex;
		gap: $unit;
		margin-bottom: $unit-2x;
	}

	.search-input,
	.embed-input {
		flex: 1;
		padding: $unit $unit-2x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		background: $white;

		&:focus {
			outline: none;
			border-color: $primary-color;
		}
	}

	.search-btn,
	.embed-btn {
		display: flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit $unit-2x;
		border: none;
		border-radius: $corner-radius-sm;
		background: $primary-color;
		color: $white;
		font-size: $font-size-small;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover:not(:disabled) {
			background: darken($primary-color, 10%);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.divider {
		text-align: center;
		color: $gray-60;
		font-size: $font-size-extra-small;
		margin: $unit-2x 0;
		position: relative;

		&::before,
		&::after {
			content: '';
			position: absolute;
			top: 50%;
			width: calc(50% - $unit-3x);
			height: 1px;
			background: $gray-90;
		}

		&::before {
			left: 0;
		}

		&::after {
			right: 0;
		}
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		width: 100%;
		padding: $unit-2x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		background: $white;
		font-size: $font-size-small;
		font-weight: 500;
		color: $gray-20;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: $gray-95;
			border-color: $gray-70;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.uploading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba($white, 0.9);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: $unit;
		color: $gray-50;
		font-size: $font-size-small;
	}

	.spinner {
		width: $unit-3x;
		height: $unit-3x;
		border: 2px solid $gray-90;
		border-top: 2px solid $primary-color;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>