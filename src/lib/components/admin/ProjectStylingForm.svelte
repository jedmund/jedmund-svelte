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
	<h2>Styling</h2>

	<div class="form-row">
		<FormFieldWrapper
			label="Background Color"
			helpText="Hex color for project card"
			error={validationErrors.backgroundColor}
		>
			<div class="color-input-wrapper">
				<input
					type="text"
					bind:value={formData.backgroundColor}
					placeholder="#FFFFFF"
					pattern="^#[0-9A-Fa-f]{6}$"
				/>
				{#if formData.backgroundColor}
					<div
						class="color-preview"
						style="background-color: {formData.backgroundColor}"
					></div>
				{/if}
			</div>
		</FormFieldWrapper>

		<FormFieldWrapper
			label="Highlight Color"
			helpText="Accent color for the project"
			error={validationErrors.highlightColor}
		>
			<div class="color-input-wrapper">
				<input
					type="text"
					bind:value={formData.highlightColor}
					placeholder="#000000"
					pattern="^#[0-9A-Fa-f]{6}$"
				/>
				{#if formData.highlightColor}
					<div class="color-preview" style="background-color: {formData.highlightColor}"></div>
				{/if}
			</div>
		</FormFieldWrapper>
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
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-2x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}

		:global(.form-field) {
			margin-bottom: 0;
		}
	}

	.color-input-wrapper {
		display: flex;
		align-items: center;
		gap: $unit-2x;

		input {
			flex: 1;
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

		.color-preview {
			width: 40px;
			height: 40px;
			border-radius: $unit;
			border: 1px solid $grey-80;
			flex-shrink: 0;
		}
	}
</style>