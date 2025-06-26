<script lang="ts">
	import Button from './Button.svelte'
	import UnifiedMediaModal from './UnifiedMediaModal.svelte'
	import type { Media } from '@prisma/client'

	interface Props {
		label: string
		value?: Media | Media[] | null
		mode: 'single' | 'multiple'
		fileType?: 'image' | 'video' | 'all'
		placeholder?: string
		required?: boolean
		error?: string
	}

	let {
		label,
		value = $bindable(),
		mode,
		fileType = 'all',
		placeholder = mode === 'single' ? 'No file selected' : 'No files selected',
		required = false,
		error
	}: Props = $props()

	let showModal = $state(false)

	function handleMediaSelect(media: Media | Media[]) {
		value = media
		showModal = false
	}

	function handleClear() {
		if (mode === 'single') {
			value = null
		} else {
			value = []
		}
	}

	function openModal() {
		showModal = true
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}

	// Computed properties
	const hasValue = $derived(
		mode === 'single'
			? value !== null && value !== undefined
			: Array.isArray(value) && value.length > 0
	)

	const displayText = $derived(
		!hasValue
			? placeholder
			: mode === 'single' && value && !Array.isArray(value)
				? value.filename
				: mode === 'multiple' && Array.isArray(value)
					? value.length === 1
						? `${value.length} file selected`
						: `${value.length} files selected`
					: placeholder
	)

	const selectedIds = $derived(
		!hasValue
			? []
			: mode === 'single' && value && !Array.isArray(value)
				? [value.id]
				: mode === 'multiple' && Array.isArray(value)
					? value.map((item) => item.id)
					: []
	)

	const modalTitle = $derived(
		mode === 'single'
			? `Select ${fileType === 'image' ? 'Image' : 'Media'}`
			: `Select ${fileType === 'image' ? 'Images' : 'Media'}`
	)

	const confirmText = $derived(mode === 'single' ? 'Select' : 'Select Files')
</script>

<div class="media-input">
	<label class="input-label">
		{label}
		{#if required}
			<span class="required">*</span>
		{/if}
	</label>

	<!-- Selected Media Preview -->
	{#if hasValue}
		<div class="selected-media">
			{#if mode === 'single' && value && !Array.isArray(value)}
				<div class="media-preview single">
					<div class="media-thumbnail">
						{#if value.thumbnailUrl}
							<img src={value.thumbnailUrl} alt={value.filename} />
						{:else}
							<div class="media-placeholder">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<rect
										x="3"
										y="5"
										width="18"
										height="14"
										rx="2"
										stroke="currentColor"
										stroke-width="2"
									/>
									<circle cx="8.5" cy="8.5" r=".5" fill="currentColor" />
									<path
										d="M3 16l5-5 3 3 4-4 4 4"
										stroke="currentColor"
										stroke-width="2"
										fill="none"
									/>
								</svg>
							</div>
						{/if}
					</div>
					<div class="media-info">
						<p class="filename">{value.filename}</p>
						<p class="file-meta">
							{formatFileSize(value.size)}
							{#if value.width && value.height}
								• {value.width}×{value.height}
							{/if}
						</p>
					</div>
				</div>
			{:else if mode === 'multiple' && Array.isArray(value) && value.length > 0}
				<div class="media-preview multiple">
					<div class="media-grid">
						{#each value.slice(0, 4) as item}
							<div class="media-thumbnail">
								{#if item.thumbnailUrl}
									<img src={item.thumbnailUrl} alt={item.filename} />
								{:else}
									<div class="media-placeholder">
										<svg
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<rect
												x="3"
												y="5"
												width="18"
												height="14"
												rx="2"
												stroke="currentColor"
												stroke-width="2"
											/>
											<circle cx="8.5" cy="8.5" r=".5" fill="currentColor" />
											<path
												d="M3 16l5-5 3 3 4-4 4 4"
												stroke="currentColor"
												stroke-width="2"
												fill="none"
											/>
										</svg>
									</div>
								{/if}
							</div>
						{/each}
						{#if value.length > 4}
							<div class="media-thumbnail overflow">
								<div class="overflow-indicator">
									+{value.length - 4}
								</div>
							</div>
						{/if}
					</div>
					<p class="selection-summary">
						{value.length} file{value.length !== 1 ? 's' : ''} selected
					</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Input Field -->
	<div class="input-field" class:has-error={error}>
		<input
			type="text"
			readonly
			value={displayText}
			class="media-input-field"
			class:placeholder={!hasValue}
		/>
		<div class="input-actions">
			<Button variant="ghost" onclick={openModal}>Browse</Button>
			{#if hasValue}
				<Button variant="ghost" onclick={handleClear} aria-label="Clear selection">
					<svg
						slot="icon"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M6 6L18 18M6 18L18 6"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
				</Button>
			{/if}
		</div>
	</div>

	<!-- Error Message -->
	{#if error}
		<p class="error-message">{error}</p>
	{/if}

	<!-- Media Library Modal -->
	<UnifiedMediaModal
		bind:isOpen={showModal}
		{mode}
		{fileType}
		{selectedIds}
		title={modalTitle}
		{confirmText}
		onSelect={handleMediaSelect}
	/>
</div>

<style lang="scss">
	.media-input {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: $gray-20;

		.required {
			color: $red-60;
			margin-left: $unit-half;
		}
	}

	.selected-media {
		padding: $unit-2x;
		background-color: $gray-95;
		border-radius: $card-corner-radius;
		border: 1px solid $gray-85;
	}

	.media-preview {
		&.single {
			display: flex;
			gap: $unit-2x;
			align-items: flex-start;
		}

		&.multiple {
			display: flex;
			flex-direction: column;
			gap: $unit;
		}
	}

	.media-thumbnail {
		width: 60px;
		height: 60px;
		border-radius: calc($card-corner-radius - 2px);
		overflow: hidden;
		background-color: $gray-90;
		flex-shrink: 0;
		position: relative;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		&.overflow {
			display: flex;
			align-items: center;
			justify-content: center;
			background-color: $gray-80;
			color: $gray-30;
			font-size: 0.75rem;
			font-weight: 600;
		}
	}

	.media-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		color: $gray-60;
	}

	.media-info {
		flex: 1;
		min-width: 0;

		.filename {
			margin: 0 0 $unit-half 0;
			font-size: 0.875rem;
			font-weight: 500;
			color: $gray-10;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.file-meta {
			margin: 0;
			font-size: 0.75rem;
			color: $gray-40;
		}
	}

	.media-grid {
		display: flex;
		gap: $unit;
		margin-bottom: $unit;
	}

	.selection-summary {
		margin: 0;
		font-size: 0.875rem;
		color: $gray-30;
		font-weight: 500;
	}

	.input-field {
		position: relative;
		display: flex;
		align-items: center;
		border: 1px solid $gray-80;
		border-radius: $card-corner-radius;
		background-color: white;
		transition: border-color 0.2s ease;

		&:focus-within {
			border-color: $blue-60;
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
		}

		&.has-error {
			border-color: $red-60;

			&:focus-within {
				border-color: $red-60;
				box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
			}
		}
	}

	.media-input-field {
		flex: 1;
		padding: $unit $unit-2x;
		border: none;
		background: transparent;
		font-size: 0.875rem;
		color: $gray-10;

		&:focus {
			outline: none;
		}

		&.placeholder {
			color: $gray-50;
		}

		&[readonly] {
			cursor: pointer;
		}
	}

	.input-actions {
		display: flex;
		align-items: center;
		padding-right: $unit-half;
		gap: $unit-half;
	}

	.error-message {
		margin: 0;
		font-size: 0.75rem;
		color: $red-60;
	}

	// Responsive adjustments
	@media (max-width: 640px) {
		.media-preview.single {
			flex-direction: column;
		}

		.media-thumbnail {
			width: 80px;
			height: 80px;
		}

		.media-grid {
			flex-wrap: wrap;
		}
	}
</style>
