<script lang="ts">
	import ViewMasonryIcon from '$icons/view-masonry.svg?component'
	import ViewSingleIcon from '$icons/view-single.svg?component'
	import ViewGridIcon from '$icons/view-grid.svg?component'

	export type ViewMode = 'masonry' | 'single' | 'grid'

	let {
		currentMode = $bindable('masonry'),
		onModeChange
	}: {
		currentMode?: ViewMode
		onModeChange?: (mode: ViewMode) => void
	} = $props()

	function handleModeChange(mode: ViewMode) {
		currentMode = mode
		onModeChange?.(mode)
	}

	const viewModes = [
		{ mode: 'masonry' as ViewMode, icon: ViewMasonryIcon, label: 'Masonry view' },
		{ mode: 'single' as ViewMode, icon: ViewSingleIcon, label: 'Single column view' },
		{ mode: 'grid' as ViewMode, icon: ViewGridIcon, label: 'Grid view' }
	]
</script>

<div class="view-mode-selector" role="group" aria-label="View mode selection">
	{#each viewModes as { mode, icon: Icon, label }}
		<button
			class="view-mode-button"
			class:active={currentMode === mode}
			onclick={() => handleModeChange(mode)}
			aria-label={label}
			aria-pressed={currentMode === mode}
			type="button"
		>
			<Icon />
		</button>
	{/each}
</div>

<style lang="scss">
	.view-mode-selector {
		display: flex;
		gap: $unit-2x;
		margin-bottom: $unit-3x;
		justify-content: flex-end;
	}

	.view-mode-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		background: transparent;
		color: $grey-60;
		cursor: pointer;
		transition: color 0.2s ease;

		&:hover {
			color: $grey-30;
		}

		&.active {
			color: $red-50;
		}

		:global(svg) {
			width: 20px;
			height: 20px;
		}
	}
</style>

