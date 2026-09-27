<script lang="ts">
	import AdminFilters from '../AdminFilters.svelte'
	import Select from '../Select.svelte'
	import Input from '../Input.svelte'
	import CloseButton from '../../icons/CloseButton.svelte'
	let {
		title,
		error,
		filterType = $bindable(),
		photographyFilter = $bindable(),
		searchQuery = $bindable(),
		onClose
	}: {
		title: string
		error: string
		filterType: string
		photographyFilter: string
		searchQuery: string
		onClose: () => void
	} = $props()
	const typeFilterOptions = [
		{ value: 'all', label: 'All types' },
		{ value: 'image', label: 'Images' },
		{ value: 'video', label: 'Videos' }
	]
	const photographyFilterOptions = [
		{ value: 'all', label: 'All Media' },
		{ value: 'true', label: 'Photography' },
		{ value: 'false', label: 'Non-Photography' }
	]
</script>

<div class="modal-header">
	<div class="header-top">
		<h2>{title}</h2>
		<button type="button" class="close-button" onclick={onClose} aria-label="Close modal">
			<CloseButton size={20} />
		</button>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	<!-- Filters -->
	<AdminFilters>
		{#snippet left()}
			<Select bind:value={filterType} options={typeFilterOptions} size="small" variant="minimal" />
			<Select
				bind:value={photographyFilter}
				options={photographyFilterOptions}
				size="small"
				variant="minimal"
			/>
		{/snippet}
		{#snippet right()}
			<Input
				type="search"
				bind:value={searchQuery}
				placeholder="Search files..."
				size="small"
				fullWidth={false}
				pill={true}
				prefixIcon
				class="search-input"
			>
				{#snippet prefix()}<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
						/>
					</svg>{/snippet}
			</Input>
		{/snippet}
	</AdminFilters>
</div>

<style lang="scss">
	.modal-header {
		position: sticky;
		display: flex;
		flex-direction: column;
		gap: $unit;
		top: 0;
		background: white;
		z-index: $z-index-dropdown;
		padding: $unit-3x $unit-3x 0 $unit-3x;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

		h2 {
			margin: 0;
			font-size: 1.5rem;
			font-weight: 600;
			color: $gray-10;
		}

		:global(.admin-filters) {
			padding: 0;
		}
	}
	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-2x;
	}
	.close-button {
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		color: $gray-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;
		padding: 0;

		&:hover {
			background: $gray-90;
			color: $gray-10;
		}

		:global(svg) {
			flex-shrink: 0;
		}
	}
	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: $unit-2x;
		border-radius: $unit;
		border: 1px solid rgba(239, 68, 68, 0.2);
		margin-bottom: $unit-2x;
	}
	:global(.search-input .input) {
		font-size: $font-size-small !important;
	}
</style>
