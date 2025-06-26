<script lang="ts">
	import Input from './Input.svelte'
	import Textarea from './Textarea.svelte'
	import SelectField from './SelectField.svelte'
	import SegmentedControlField from './SegmentedControlField.svelte'
	import type { ProjectFormData } from '$lib/types/project'

	interface Props {
		formData: ProjectFormData
		validationErrors: Record<string, string>
		onSave?: () => Promise<void>
	}

	let { formData = $bindable(), validationErrors, onSave }: Props = $props()
</script>

<div class="form-section">
	<Input
		label="Title"
		required
		size="jumbo"
		error={validationErrors.title}
		bind:value={formData.title}
		placeholder="Project title"
	/>

	<Textarea
		label="Description"
		size="jumbo"
		error={validationErrors.description}
		bind:value={formData.description}
		rows={3}
		placeholder="Short description for project cards"
	/>

	<Input
		type="url"
		label="External URL"
		error={validationErrors.externalUrl}
		bind:value={formData.externalUrl}
		placeholder="https://example.com"
	/>

	<div class="form-row three-column">
		<SegmentedControlField
			label="Project Type"
			bind:value={formData.projectType}
			error={validationErrors.projectType}
			options={[
				{ value: 'work', label: 'Work' },
				{ value: 'labs', label: 'Labs' }
			]}
		/>

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
		gap: $unit-4x;

		&:last-child {
			margin-bottom: 0;
		}

		h2 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0;
			color: $gray-10;
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-4x;
		padding-bottom: $unit-3x;

		&.three-column {
			grid-template-columns: 1fr 1fr 1fr;
		}

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}
	}
</style>
