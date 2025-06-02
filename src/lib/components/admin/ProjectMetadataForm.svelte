<script lang="ts">
	import Input from './Input.svelte'
	import Select from './Select.svelte'
	import ImageUploader from './ImageUploader.svelte'
	import type { ProjectFormData } from '$lib/types/project'

	interface Props {
		formData: ProjectFormData
		validationErrors: Record<string, string>
	}

	let { formData = $bindable(), validationErrors }: Props = $props()

	function handleFeaturedImageUpload(media: Media) {
		formData.featuredImage = media.url
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

	<Select
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

	<ImageUploader
		label="Featured Image"
		value={null}
		onUpload={handleFeaturedImageUpload}
		placeholder="Upload a featured image for this project"
		showBrowseLibrary={true}
	/>

	<Select
		label="Project Status"
		bind:value={formData.status}
		error={validationErrors.status}
		options={[
			{ value: 'draft', label: 'Draft (Hidden)' },
			{ value: 'published', label: 'Published' },
			{ value: 'list-only', label: 'List Only (No Access)' },
			{ value: 'password-protected', label: 'Password Protected' }
		]}
		helpText="Control how this project appears on the public site"
	/>

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
</style>
