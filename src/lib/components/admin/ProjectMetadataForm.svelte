<script lang="ts">
	import Input from './Input.svelte'
	import SelectField from './SelectField.svelte'
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

	// State for collapsible featured image section
	let showFeaturedImage = $state(!!formData.featuredImage && formData.featuredImage !== '' && formData.featuredImage !== null)

	// Convert featuredImage string to Media object for ImageUploader
	let featuredImageMedia = $state<Media | null>(null)

	// Initialize media object from existing featuredImage URL
	$effect(() => {
		if (formData.featuredImage && formData.featuredImage !== '' && formData.featuredImage !== null && !featuredImageMedia) {
			// Only create a minimal Media object if we don't already have one
			featuredImageMedia = {
				id: -1, // Temporary ID for existing URLs
				filename: 'featured-image',
				originalName: 'featured-image',
				mimeType: 'image/jpeg',
				size: 0,
				url: formData.featuredImage,
				thumbnailUrl: formData.featuredImage,
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

	// Sync featuredImageMedia changes back to formData
	$effect(() => {
		if (!featuredImageMedia && formData.featuredImage) {
			formData.featuredImage = ''
		}
	})

	function handleFeaturedImageUpload(media: Media) {
		formData.featuredImage = media.url
		featuredImageMedia = media
	}

	async function handleFeaturedImageRemove() {
		formData.featuredImage = ''
		featuredImageMedia = null
		showFeaturedImage = false
		
		// Auto-save the removal
		if (onSave) {
			await onSave()
		}
	}

</script>

<div class="form-section">
	<Input
		label="Title"
		required
		error={validationErrors.title}
		bind:value={formData.title}
		placeholder="Project title"
	/>

	<Input
		type="textarea"
		label="Description"
		error={validationErrors.description}
		bind:value={formData.description}
		rows={3}
		placeholder="Short description for project cards"
	/>

	<SelectField
		label="Project Type"
		bind:value={formData.projectType}
		error={validationErrors.projectType}
		options={[
			{ value: 'work', label: 'Work' },
			{ value: 'labs', label: 'Labs' }
		]}
		helpText="Choose whether this project appears in the Work tab or Labs tab"
	/>

	<div class="form-row">
		<Input
			type="number"
			label="Year"
			required
			error={validationErrors.year}
			bind:value={formData.year}
			min={1990}
			max={new Date().getFullYear() + 1}
		/>

		<Input
			label="Client"
			error={validationErrors.client}
			bind:value={formData.client}
			placeholder="Client or company name"
		/>
	</div>

	<Input
		type="url"
		label="External URL"
		error={validationErrors.externalUrl}
		bind:value={formData.externalUrl}
		placeholder="https://example.com"
	/>

	{#if !showFeaturedImage}
		<Button
			variant="secondary"
			buttonSize="medium"
			onclick={() => showFeaturedImage = true}
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
				<circle cx="8.5" cy="8.5" r="1.5"></circle>
				<polyline points="21 15 16 10 5 21"></polyline>
			</svg>
			Add Featured Image
		</Button>
	{:else if showFeaturedImage}
		<div class="collapsible-section">
			<div class="section-header">
				<h3>Featured Image</h3>
			</div>
			<ImageUploader
				label=""
				bind:value={featuredImageMedia}
				onUpload={handleFeaturedImageUpload}
				onRemove={handleFeaturedImageRemove}
				placeholder="Upload a featured image for this project"
				showBrowseLibrary={true}
			/>
		</div>
	{/if}

	{#if formData.status === 'password-protected'}
		<Input
			type="password"
			label="Project Password"
			required
			error={validationErrors.password}
			bind:value={formData.password}
			placeholder="Enter a password for this project"
			helpText="Users will need this password to access the project details"
		/>
	{/if}
</div>

<style lang="scss">
	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-2x;
		padding-bottom: $unit-3x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}
	}

	.collapsible-section {
		// No border or background needed
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-2x;

		h3 {
			font-size: 0.875rem;
			font-weight: 600;
			margin: 0;
			color: $grey-20;
		}
	}

</style>
