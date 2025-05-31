<script lang="ts">
	import Input from './Input.svelte'
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
			color: $grey-10;
			}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-2x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}

		:global(.input-wrapper) {
			margin-bottom: 0;
		}
	}
</style>
