<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import type { Media } from '@prisma/client'
	import MediaIcon from '$icons/media.svg?component'
	import Upload from 'lucide-svelte/icons/upload'
	import Link from 'lucide-svelte/icons/link'
	import Images from 'lucide-svelte/icons/images'
	import Search from 'lucide-svelte/icons/search'
	import { mediaSelectionStore } from '$lib/stores/media-selection'
	import Pane from '$components/ui/Pane.svelte'

	interface Props {
		editor: Editor
		position: { x: number; y: number }
		contentType: ContentType
		onClose: () => void
		deleteNode?: () => void
		albumId?: number
	}

	let { editor, position, contentType, onClose, deleteNode, albumId }: Props = $props()

	type ContentType = 'image' | 'video' | 'audio' | 'gallery' | 'location'
	type ActionType = 'upload' | 'embed' | 'gallery' | 'search'

	// Set default action based on content type
	const defaultAction = $derived(() => {
		if (contentType === 'location') return 'search'
		if (contentType === 'gallery') return 'gallery'
		if (contentType === 'image') return 'gallery'
		return 'upload'
	})

	let selectedAction = $state<ActionType>(defaultAction())
	let embedUrl = $state('')
	let isUploading = $state(false)
	let fileInput: HTMLInputElement
	let isOpen = $state(true)

	// Location form fields
	let locationTitle = $state('')
	let locationDescription = $state('')
	let locationLat = $state('')
	let locationLng = $state('')
	let locationMarkerColor = $state('#ef4444')
	let locationZoom = $state(15)

	const availableActions = $derived(() => {
		switch (contentType) {
			case 'image':
				return [
					{ type: 'gallery' as ActionType, icon: MediaIcon, label: 'Gallery' },
					{ type: 'upload' as ActionType, icon: Upload, label: 'Upload' },
					{ type: 'embed' as ActionType, icon: Link, label: 'Embed' }
				]
			case 'video':
			case 'audio':
				return [
					{ type: 'gallery' as ActionType, icon: MediaIcon, label: 'Gallery' },
					{ type: 'upload' as ActionType, icon: Upload, label: 'Upload' },
					{ type: 'embed' as ActionType, icon: Link, label: 'Embed' }
				]
			case 'gallery':
				return [{ type: 'gallery' as ActionType, icon: Images, label: 'Gallery' }]
			case 'location':
				return [
					{ type: 'search' as ActionType, icon: Search, label: 'Search' },
					{ type: 'embed' as ActionType, icon: Link, label: 'Embed' }
				]
			default:
				return []
		}
	})

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
			const file = files[0]
			const formData = new FormData()
			formData.append('file', file)
			formData.append('type', contentType)

			if (albumId) {
				formData.append('albumId', albumId.toString())
			}

			const response = await fetch('/api/media/upload', {
				method: 'POST',
				body: formData,
				credentials: 'same-origin'
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
				editor.chain().focus().setVideo(embedUrl).run()
				break
			case 'audio':
				editor.chain().focus().setAudio(embedUrl).run()
				break
			case 'location': {
				// For location, try to extract coordinates from Google Maps URL
				const coords = extractCoordinatesFromUrl(embedUrl)
				if (coords) {
					editor
						.chain()
						.focus()
						.insertContent({
							type: 'geolocation',
							attrs: {
								latitude: coords.lat,
								longitude: coords.lng,
								title: 'Location',
								description: ''
							}
						})
						.run()
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
		const fileType = contentType === 'gallery' ? 'image' : contentType
		const mode = contentType === 'gallery' ? 'multiple' : 'single'

		// Close the pane first to prevent z-index issues
		handlePaneClose()

		// Open the media modal after a short delay to ensure pane is closed
		setTimeout(() => {
			mediaSelectionStore.open({
				mode,
				fileType: fileType as 'image' | 'video' | 'audio',
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
		}, 150)
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
								alt: media.altText || '',
								title: media.description || '',
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
			/@(-?\d+\.\d+),(-?\d+\.\d+)/, // @lat,lng format
			/ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ll=lat,lng format
			/q=(-?\d+\.\d+),(-?\d+\.\d+)/ // q=lat,lng format
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

	function handleLocationInsert() {
		const lat = parseFloat(locationLat)
		const lng = parseFloat(locationLng)

		if (isNaN(lat) || isNaN(lng)) {
			alert('Please enter valid coordinates')
			return
		}

		editor
			.chain()
			.focus()
			.insertContent({
				type: 'geolocation',
				attrs: {
					latitude: lat,
					longitude: lng,
					title: locationTitle || undefined,
					description: locationDescription || undefined,
					markerColor: locationMarkerColor,
					zoom: locationZoom
				}
			})
			.run()

		deleteNode?.()
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
</script>

<Pane
	bind:isOpen
	{position}
	showCloseButton={false}
	closeOnBackdrop={true}
	closeOnEscape={true}
	maxWidth="400px"
	maxHeight="auto"
	onClose={handlePaneClose}
>
	{#if availableActions().length > 1}
		<div class="action-selector">
			{#each availableActions() as action}
				<button
					class="action-tab"
					class:active={selectedAction === action.type}
					onclick={() => (selectedAction = action.type)}
				>
					<svelte:component this={action.icon} size={16} />
					<span>{action.label}</span>
				</button>
			{/each}
		</div>
	{/if}

	<div class="pane-content">
		{#if selectedAction === 'upload'}
			<div class="upload-section">
				<button class="upload-btn" onclick={handleUpload} disabled={isUploading}>
					<Upload size={48} />
					<span>Click to upload {contentType}</span>
					<span class="upload-hint">or drag and drop</span>
				</button>
			</div>
		{:else if selectedAction === 'embed'}
			<div class="embed-section">
				{#if contentType === 'location'}
					<p class="section-description">Paste a Google Maps link to embed a location</p>
				{:else}
					<p class="section-description">
						Paste a URL to embed {contentType === 'image' ? 'an' : 'a'}
						{contentType}
					</p>
				{/if}
				<input
					bind:value={embedUrl}
					placeholder={contentType === 'location'
						? 'https://maps.google.com/...'
						: `https://example.com/${contentType}.${contentType === 'image' ? 'jpg' : contentType === 'video' ? 'mp4' : 'mp3'}`}
					class="embed-input"
					onkeydown={handleKeydown}
				/>
				<button class="embed-btn" onclick={handleEmbed} disabled={!embedUrl.trim()}> Embed </button>
			</div>
		{:else if selectedAction === 'gallery'}
			<div class="gallery-section">
				<button class="gallery-btn" onclick={handleGallerySelect}>
					<Images size={48} />
					<span>Choose from media library</span>
				</button>
			</div>
		{:else if selectedAction === 'search' && contentType === 'location'}
			<div class="location-form">
				<div class="form-group">
					<label class="form-label">Title (optional)</label>
					<input bind:value={locationTitle} placeholder="Location name" class="form-input" />
				</div>

				<div class="form-group">
					<label class="form-label">Description (optional)</label>
					<textarea
						bind:value={locationDescription}
						placeholder="About this location"
						class="form-textarea"
						rows="2"
					/>
				</div>

				<div class="coordinates-group">
					<div class="form-group">
						<label class="form-label">Latitude <span class="required">*</span></label>
						<input
							bind:value={locationLat}
							placeholder="37.7749"
							type="number"
							step="0.000001"
							class="form-input"
							required
						/>
					</div>
					<div class="form-group">
						<label class="form-label">Longitude <span class="required">*</span></label>
						<input
							bind:value={locationLng}
							placeholder="-122.4194"
							type="number"
							step="0.000001"
							class="form-input"
							required
						/>
					</div>
				</div>

				<div class="location-options">
					<label class="option-label">
						Marker Color
						<input type="color" bind:value={locationMarkerColor} class="color-input" />
					</label>
					<label class="option-label">
						Zoom Level: {locationZoom}
						<input type="range" bind:value={locationZoom} min="1" max="20" class="zoom-input" />
					</label>
				</div>

				<button
					class="submit-btn"
					onclick={handleLocationInsert}
					disabled={!locationLat || !locationLng}
				>
					Insert Location
				</button>
			</div>
		{/if}

		{#if isUploading}
			<div class="uploading-overlay">
				<div class="spinner"></div>
				<span>Uploading...</span>
			</div>
		{/if}
	</div>
</Pane>

<!-- Hidden file input -->
<input bind:this={fileInput} type="file" onchange={handleFileUpload} style="display: none;" />

<style lang="scss">
	@import '$styles/variables';

	.action-selector {
		display: flex;
		gap: 0;
		border-bottom: 1px solid $gray-90;
	}

	.action-tab {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $unit-half;
		padding: $unit-2x;
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: $gray-40;
		font-size: $font-size-small;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		position: relative;
		top: 2px;
		flex: 1;

		&:hover {
			color: $gray-20;
		}

		&.active {
			color: $primary-color;
			border-bottom-color: $primary-color;
		}

		span {
			@media (max-width: 480px) {
				display: none;
			}
		}
	}

	.pane-content {
		position: relative;
		padding: $unit-3x;
	}

	.upload-section,
	.gallery-section {
		display: flex;
		justify-content: center;
		padding: 0;
	}

	.upload-btn,
	.gallery-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-4x;
		border: 2px dashed $gray-85;
		border-radius: $corner-radius;
		background: $gray-95;
		color: $gray-40;
		font-size: $font-size-small;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;

		&:hover {
			background: $gray-90;
			border-color: $gray-70;
			color: $gray-20;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.upload-hint {
			font-size: $font-size-extra-small;
			color: $gray-60;
		}
	}

	.embed-section {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.section-description {
		margin: 0;
		color: $gray-40;
		font-size: $font-size-small;
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

	.location-form {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}

	.form-label {
		font-size: $font-size-extra-small;
		font-weight: 500;
		color: $gray-30;
	}

	.form-input,
	.form-textarea {
		padding: $unit $unit-2x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		background: $white;
		font-family: inherit;

		&:focus {
			outline: none;
			border-color: $primary-color;
		}
	}

	.form-textarea {
		resize: vertical;
		min-height: 60px;
	}

	.coordinates-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-2x;
	}

	.location-options {
		display: flex;
		gap: $unit-3x;
		align-items: center;
	}

	.option-label {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: $font-size-extra-small;
		font-weight: 500;
		color: $gray-30;
	}

	.color-input {
		width: 36px;
		height: 24px;
		padding: 0;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		cursor: pointer;
	}

	.zoom-input {
		width: 100px;
	}

	.submit-btn {
		width: 100%;
		padding: $unit-2x;
		background: $primary-color;
		color: $white;
		border: none;
		border-radius: $corner-radius-sm;
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

	.required {
		color: $red-60;
	}
</style>
