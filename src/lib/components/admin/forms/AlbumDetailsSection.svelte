<script lang="ts">
	import Input from '../Input.svelte'
	import DropdownSelectField from '../DropdownSelectField.svelte'
	let {
		title = $bindable(),
		slug = $bindable(),
		location = $bindable(),
		year = $bindable(),
		status = $bindable(),
		showInUniverse = $bindable(),
		editing,
		heartCount
	}: {
		title: string
		slug: string
		location: string
		year: string
		status: 'draft' | 'published'
		showInUniverse: boolean
		editing: boolean
		heartCount?: number
	} = $props()
	const statusOptions = [
		{ value: 'draft', label: 'Draft', description: 'Only visible to you' },
		{ value: 'published', label: 'Published', description: 'Visible on your public site' }
	]
</script>

<!-- Album Details -->
<div class="form-section">
	<Input label="Title" size="jumbo" bind:value={title} placeholder="Album title" required />

	<Input
		label="Slug"
		bind:value={slug}
		placeholder="url-friendly-name"
		required
		disabled={editing}
	/>

	<div class="form-grid">
		<Input label="Location" bind:value={location} placeholder="e.g. Tokyo, Japan" />
		<Input label="Year" type="text" bind:value={year} placeholder="e.g. 2023 or 2023-2025" />
	</div>

	<DropdownSelectField label="Status" bind:value={status} options={statusOptions} />

	{#if editing && heartCount != null}
		<div class="stat-row">
			<span class="stat-label">Hearts</span>
			<span class="stat-value">{heartCount}</span>
		</div>
	{/if}
</div>

<!-- Display Settings -->
<div class="form-section">
	<label class="toggle-label">
		<input type="checkbox" bind:checked={showInUniverse} class="toggle-input" />
		<div class="toggle-content">
			<span class="toggle-title">Show in Universe</span>
			<span class="toggle-description">Display this album in the Universe feed</span>
		</div>
		<span class="toggle-slider"></span>
	</label>
</div>

<style lang="scss">
	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
		margin-bottom: $unit-6x;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-3x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}
	}
	.toggle-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $unit-3x;
		cursor: pointer;
		user-select: none;
	}
	.toggle-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;

		&:checked + .toggle-content + .toggle-slider {
			background-color: $blue-60;

			&::before {
				transform: translateX(20px);
			}
		}

		&:disabled + .toggle-content + .toggle-slider {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
	.toggle-slider {
		position: relative;
		width: 44px;
		height: 24px;
		background-color: $gray-80;
		border-radius: 12px;
		transition: background-color 0.2s ease;
		flex-shrink: 0;

		&::before {
			content: '';
			position: absolute;
			top: 2px;
			left: 2px;
			width: 20px;
			height: 20px;
			background-color: white;
			border-radius: 50%;
			transition: transform 0.2s ease;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}
	}
	.toggle-content {
		display: flex;
		flex-direction: column;
		gap: $unit-half;

		.toggle-title {
			font-weight: 500;
			color: $gray-10;
			font-size: 0.875rem;
		}

		.toggle-description {
			font-size: 0.75rem;
			color: $gray-50;
			line-height: 1.4;
		}
	}
	.stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit-2x 0;

		.stat-label {
			font-size: 0.875rem;
			font-weight: 500;
			color: $gray-40;
		}

		.stat-value {
			font-size: 0.875rem;
			font-weight: 500;
			color: $gray-20;
		}
	}
</style>
