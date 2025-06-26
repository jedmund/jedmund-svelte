<script lang="ts">
	import Input from './Input.svelte'
	import ImageUploader from './ImageUploader.svelte'
	import Button from './Button.svelte'
	import type { ProjectFormData } from '$lib/types/project'
	import type { Media } from '@prisma/client'

	interface Props {
		formData: ProjectFormData
		validationErrors: Record<string, string>
		onSave?: () => Promise<void>
	}

	let { formData = $bindable(), validationErrors, onSave }: Props = $props()

	// State for collapsible logo section
	let showLogoSection = $state(!!formData.logoUrl && formData.logoUrl.trim() !== '')

	// Convert logoUrl string to Media object for ImageUploader
	let logoMedia = $state<Media | null>(null)

	// Update logoMedia when logoUrl changes
	$effect(() => {
		if (formData.logoUrl && formData.logoUrl.trim() !== '' && !logoMedia) {
			// Create a minimal Media object from the URL for display
			logoMedia = {
				id: -1, // Temporary ID for existing URLs
				filename: 'logo.svg',
				originalName: 'logo.svg',
				mimeType: 'image/svg+xml',
				size: 0,
				url: formData.logoUrl,
				thumbnailUrl: formData.logoUrl,
				width: null,
				height: null,
				altText: null,
				description: null,
				usedIn: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}
		}
	})

	// Sync logoMedia changes back to formData
	$effect(() => {
		if (!logoMedia && formData.logoUrl) {
			formData.logoUrl = ''
		}
	})

	function handleLogoUpload(media: Media) {
		formData.logoUrl = media.url
		logoMedia = media
	}

	async function handleLogoRemove() {
		formData.logoUrl = ''
		logoMedia = null
		showLogoSection = false

		// Auto-save the removal
		if (onSave) {
			await onSave()
		}
	}
</script>

<div class="form-section">
	<h2>Branding</h2>

	{#if !showLogoSection && (!formData.logoUrl || formData.logoUrl.trim() === '')}
		<Button
			variant="secondary"
			buttonSize="medium"
			onclick={() => (showLogoSection = true)}
			iconPosition="left"
		>
			<svg
				slot="icon"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<line x1="12" y1="3" x2="12" y2="21"></line>
				<line x1="3" y1="12" x2="21" y2="12"></line>
			</svg>
			Add Project Logo
		</Button>
	{:else}
		<div class="collapsible-section">
			<div class="section-header">
				<h3>Project Logo</h3>
			</div>
			<ImageUploader
				label=""
				bind:value={logoMedia}
				onUpload={handleLogoUpload}
				onRemove={handleLogoRemove}
				aspectRatio="1:1"
				allowAltText={true}
				maxFileSize={0.5}
				placeholder="Drag and drop an SVG logo here, or click to browse"
				helpText="Upload an SVG logo for project thumbnail (max 500KB). Square logos work best."
				showBrowseLibrary={true}
				compact={true}
			/>
		</div>
	{/if}

	<div class="form-row">
		<Input
			type="text"
			bind:value={formData.backgroundColor}
			label="Background Color"
			helpText="Hex color for project card"
			error={validationErrors.backgroundColor}
			placeholder="#FFFFFF"
			pattern="^#[0-9A-Fa-f]{6}$"
			colorSwatch={true}
		/>

		<Input
			type="text"
			bind:value={formData.highlightColor}
			label="Highlight Color"
			helpText="Accent color for the project"
			error={validationErrors.highlightColor}
			placeholder="#000000"
			pattern="^#[0-9A-Fa-f]{6}$"
			colorSwatch={true}
		/>
	</div>
</div>

<style lang="scss">
	.form-section {
		margin-bottom: $unit-6x;

		&:last-child {
			margin-bottom: 0;
		}

		h2 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0 0 $unit-3x;
			color: $gray-10;
		}
	}

	.collapsible-section {
		// No border or background needed
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;

		h3 {
			font-size: 0.875rem;
			font-weight: 600;
			margin: 0;
			color: $gray-20;
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-2x;
		margin-top: $unit-3x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}

		:global(.input-wrapper) {
			margin-bottom: 0;
		}
	}
</style>
