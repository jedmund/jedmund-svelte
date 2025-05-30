<script lang="ts">
	import FormFieldWrapper from './FormFieldWrapper.svelte'
	import type { ProjectFormData } from '$lib/types/project'

	interface Props {
		formData: ProjectFormData
		validationErrors: Record<string, string>
	}

	let { formData = $bindable(), validationErrors }: Props = $props()
</script>

<div class="form-section">
	<FormFieldWrapper label="Title" required error={validationErrors.title}>
		<input type="text" bind:value={formData.title} required placeholder="Project title" />
	</FormFieldWrapper>

	<FormFieldWrapper label="Description" error={validationErrors.description}>
		<textarea
			bind:value={formData.description}
			rows="3"
			placeholder="Short description for project cards"
		/>
	</FormFieldWrapper>

	<div class="form-row">
		<FormFieldWrapper label="Year" required error={validationErrors.year}>
			<input
				type="number"
				bind:value={formData.year}
				required
				min="1990"
				max={new Date().getFullYear() + 1}
			/>
		</FormFieldWrapper>

		<FormFieldWrapper label="Client" error={validationErrors.client}>
			<input type="text" bind:value={formData.client} placeholder="Client or company name" />
		</FormFieldWrapper>
	</div>

	<FormFieldWrapper label="External URL" error={validationErrors.externalUrl}>
		<input type="url" bind:value={formData.externalUrl} placeholder="https://example.com" />
	</FormFieldWrapper>
</div>

<style lang="scss">
	.form-section {
		margin-bottom: $unit-6x;

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

		:global(.form-field) {
			margin-bottom: 0;
		}
	}

	input[type='text'],
	input[type='url'],
	input[type='number'],
	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: calc($unit * 1.5);
		border: 1px solid $grey-80;
		border-radius: $unit;
		font-size: 1rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		transition: border-color 0.2s ease;
		background-color: white;
		color: #333;

		&:focus {
			outline: none;
			border-color: $grey-40;
		}

		&::placeholder {
			color: #999;
		}
	}

	textarea {
		resize: vertical;
		min-height: 80px;
	}
</style>