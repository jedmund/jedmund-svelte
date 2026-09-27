<script lang="ts">
	import { onDestroy } from 'svelte'
	import {
		createInsertionController,
		type ContentType,
		type ActionType
	} from './insertion-controller.svelte'
	import InsertionLocationForm from './InsertionLocationForm.svelte'
	import InsertionEmbedForm from './InsertionEmbedForm.svelte'
	import type { LocationAttributes } from '../../extensions/geolocation/GeolocationExtended.js'
	import type { Editor } from '@tiptap/core'
	import MediaIcon from '$icons/media.svg?component'
	import Upload from '@lucide/svelte/icons/upload'
	import Link from '@lucide/svelte/icons/link'
	import Images from '@lucide/svelte/icons/images'
	import Search from '@lucide/svelte/icons/search'
	import Pane from '$components/ui/Pane.svelte'

	interface Props {
		editor: Editor
		position: { x: number; y: number }
		contentType: ContentType
		onClose: () => void
		deleteNode?: () => void
		albumId?: number
		initialLocation?: LocationAttributes
		onLocationSelect?: (location: LocationAttributes) => void
		initialUrl?: string
	}

	let {
		editor,
		position,
		contentType,
		onClose,
		deleteNode,
		albumId,
		initialUrl,
		initialLocation,
		onLocationSelect
	}: Props = $props()

	const controller = createInsertionController({
		editor,
		contentType,
		onClose,
		deleteNode,
		albumId,
		initialUrl,
		initialLocation,
		onLocationSelect
	})
	onDestroy(() => controller.dispose())
	const availableActions = $derived.by(() => {
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
</script>

<Pane
	bind:isOpen={controller.isOpen}
	{position}
	showCloseButton={false}
	closeOnBackdrop={true}
	closeOnEscape={true}
	maxWidth="400px"
	maxHeight="auto"
	onClose={controller.handlePaneClose}
>
	{#if availableActions.length > 1}
		<div class="action-selector">
			{#each availableActions as action}
				{@const Icon = action.icon}
				<button
					type="button"
					class="action-tab"
					class:active={controller.selectedAction === action.type}
					onclick={() => (controller.selectedAction = action.type)}
				>
					<Icon size={16} />
					<span>{action.label}</span>
				</button>
			{/each}
		</div>
	{/if}

	<div class="pane-content">
		{#if controller.selectedAction === 'upload'}
			<div class="upload-section">
				<button
					type="button"
					class="upload-btn"
					onclick={controller.handleUpload}
					disabled={controller.isUploading}
				>
					<Upload size={48} />
					<span>Click to upload {contentType}</span>
					<span class="upload-hint">or drag and drop</span>
				</button>
			</div>
		{:else if controller.selectedAction === 'embed'}
			<InsertionEmbedForm
				{contentType}
				bind:embedUrl={controller.embedUrl}
				handleEmbed={controller.handleEmbed}
				handleKeydown={controller.handleKeydown}
			/>
		{:else if controller.selectedAction === 'gallery'}
			<div class="gallery-section">
				<button type="button" class="gallery-btn" onclick={controller.handleGallerySelect}>
					<Images size={48} />
					<span>Choose from media library</span>
				</button>
			</div>
		{:else if controller.selectedAction === 'search' && contentType === 'location'}
			<InsertionLocationForm
				bind:locationTitle={controller.locationTitle}
				bind:locationDescription={controller.locationDescription}
				bind:locationLat={controller.locationLat}
				bind:locationLng={controller.locationLng}
				bind:locationMarkerColor={controller.locationMarkerColor}
				bind:locationZoom={controller.locationZoom}
				onLocationSelect={!!onLocationSelect}
				handleLocationInsert={controller.handleLocationInsert}
			/>
		{/if}

		{#if controller.isUploading}
			<div class="uploading-overlay">
				<div class="spinner"></div>
				<span>Uploading...</span>
			</div>
		{/if}
	</div>
</Pane>

<!-- Hidden file input -->
<input
	bind:this={controller.fileInput}
	type="file"
	onchange={controller.handleFileUpload}
	style="display: none;"
/>

<style lang="scss">
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
	}

	.upload-hint {
		font-size: $font-size-extra-small;
		color: $gray-60;
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
