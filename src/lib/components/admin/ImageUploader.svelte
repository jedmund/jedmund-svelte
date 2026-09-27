<script lang="ts">
	import { onDestroy, untrack } from 'svelte'
	import type { Media } from '@prisma/client'
	import Button from './Button.svelte'
	import UnifiedMediaModal from './UnifiedMediaModal.svelte'
	import ImageDropZone from './image-uploader/ImageDropZone.svelte'
	import ImagePreview from './image-uploader/ImagePreview.svelte'
	import ImageDescription from './image-uploader/ImageDescription.svelte'
	import { createUploadSession, type UploadState } from './image-uploader/upload-session'
	import {
		createDescriptionSession,
		type DescriptionState
	} from './image-uploader/description-session'

	interface Props {
		label: string
		value?: Media | null
		onUpload: (media: Media) => void
		onRemove?: () => void
		aspectRatio?: string
		required?: boolean
		error?: string
		allowAltText?: boolean // Deprecated compatibility prop; description supplies alt text.
		maxFileSize?: number
		placeholder?: string
		helpText?: string
		showBrowseLibrary?: boolean
		compact?: boolean
	}
	let {
		label,
		value = $bindable(),
		onUpload,
		onRemove,
		aspectRatio,
		required = false,
		error,
		maxFileSize = 10,
		placeholder = 'Drag and drop an image here, or click to browse',
		helpText,
		showBrowseLibrary = false,
		compact = false
	}: Props = $props()

	let uploadState = $state<UploadState>({ status: 'idle', progress: 0, error: null })
	let descriptionState = $state<DescriptionState>({ saving: false, error: null })
	let descriptionValue = $state(untrack(() => value?.description || ''))
	let isMediaLibraryOpen = $state(false)
	let fileInput: HTMLInputElement
	const busy = $derived(uploadState.status === 'uploading')
	const upload = createUploadSession({
		onState: (state) => {
			uploadState = state
		},
		onComplete: selectMedia
	})
	const description = createDescriptionSession({
		onState: (state) => {
			descriptionState = state
		},
		onSaved: (update) => {
			if (value?.id === update.id) value = { ...value, ...update }
		}
	})
	let mediaKey: string | undefined
	$effect(() => {
		const key = value ? `${value.id}:${value.url}` : ''
		if (key === mediaKey) return
		mediaKey = key
		untrack(() => {
			upload.cancel()
			description.select(value?.id ?? null)
			descriptionValue = value?.description || ''
		})
	})
	onDestroy(() => {
		upload.dispose()
		description.dispose()
	})

	function selectMedia(media: Media) {
		value = media
		descriptionValue = media.description || ''
		onUpload(media)
	}
	function browse() {
		if (!busy) fileInput?.click()
	}
	function startUpload(file: File) {
		return upload.start(file, maxFileSize, descriptionValue)
	}
	function fileChanged(event: Event) {
		const input = event.target as HTMLInputElement
		const file = input.files?.[0]
		input.value = ''
		if (file) startUpload(file)
	}
	function remove() {
		upload.cancel()
		uploadState = { status: 'idle', progress: 0, error: null }
		value = null
		descriptionValue = ''
		onRemove?.()
	}
</script>

<div class="image-uploader" class:compact>
	<div class="uploader-label">
		{label}{#if required}<span class="required">*</span>{/if}
	</div>
	{#if helpText}<p class="help-text">{helpText}</p>{/if}
	{#if value && !busy}
		<ImagePreview media={value} {compact} {aspectRatio} onReplace={browse} onRemove={remove}>
			<ImageDescription
				bind:value={descriptionValue}
				{compact}
				saving={descriptionState.saving}
				error={descriptionState.error}
				onSave={() => description.save(descriptionValue)}
			/>
		</ImagePreview>
	{:else}
		<ImageDropZone
			{label}
			{placeholder}
			{maxFileSize}
			{aspectRatio}
			{busy}
			progress={uploadState.progress}
			hasError={!!uploadState.error}
			onBrowse={browse}
			onFile={startUpload}
		/>
	{/if}
	{#if !value && !busy}
		<div class="action-buttons">
			<Button type="button" variant="primary" onclick={browse}>Choose File</Button>
			{#if showBrowseLibrary}
				<Button
					type="button"
					variant="ghost"
					onclick={() => {
						isMediaLibraryOpen = true
					}}>Browse Library</Button
				>
			{/if}
		</div>
	{/if}
	{#if error || uploadState.error}<p class="error-message" role="alert">
			{error || uploadState.error}
		</p>{/if}
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		aria-label={label || 'Image file'}
		hidden
		disabled={busy}
		onchange={fileChanged}
	/>
</div>

<UnifiedMediaModal
	bind:isOpen={isMediaLibraryOpen}
	mode="single"
	fileType="image"
	title="Select Image"
	confirmText="Select Image"
	onSelect={(selected) => {
		const media = Array.isArray(selected) ? selected[0] : selected
		if (!busy && media) {
			uploadState = { status: 'idle', progress: 0, error: null }
			selectMedia(media)
		}
	}}
	onClose={() => {
		isMediaLibraryOpen = false
	}}
/>

<style lang="scss">
	.image-uploader {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		&.compact {
			gap: $unit;
		}
	}
	.uploader-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: $gray-20;
	}
	.required {
		color: $red-60;
		margin-left: $unit-half;
	}
	.help-text {
		margin: 0;
		font-size: 0.8rem;
		color: $gray-40;
		line-height: 1.4;
	}
	.action-buttons {
		display: flex;
		gap: $unit-2x;
		align-items: center;
	}
	.error-message {
		margin: 0;
		font-size: 0.75rem;
		color: $red-60;
		padding: $unit;
		background-color: rgba($red-60, 0.05);
		border-radius: $card-corner-radius;
		border: 1px solid rgba($red-60, 0.2);
	}
	@media (max-width: 640px) {
		.action-buttons {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
