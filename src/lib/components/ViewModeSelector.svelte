<script lang="ts">
	import PhotosIcon from '$icons/photos.svg?component'
	import ViewSingleIcon from '$icons/view-single.svg?component'
	import ViewTwoColumnIcon from '$icons/view-two-column.svg?component'
	import ViewHorizontalIcon from '$icons/view-horizontal.svg?component'
	import WidthNormalIcon from '$icons/width-normal.svg?component'
	import WidthWideIcon from '$icons/width-wide.svg?component'

	export type ViewMode = 'masonry' | 'single' | 'two-column' | 'horizontal'

	interface Props {
		mode?: ViewMode
		width?: 'normal' | 'wide'
		onModeChange?: (mode: ViewMode) => void
		onWidthChange?: (width: 'normal' | 'wide') => void
	}

	let { mode = 'two-column', width = 'wide', onModeChange, onWidthChange }: Props = $props()
</script>

<div class="view-mode-selector">
	<div class="mode-section">
		<button
			class="mode-button"
			class:selected={mode === 'single'}
			aria-label="Single column view"
			onclick={() => onModeChange?.('single')}
		>
			<ViewSingleIcon />
		</button>
		<button
			class="mode-button"
			class:selected={mode === 'two-column'}
			aria-label="Two column view"
			onclick={() => onModeChange?.('two-column')}
		>
			<ViewTwoColumnIcon />
		</button>
		<button
			class="mode-button"
			class:selected={mode === 'masonry'}
			aria-label="Masonry view"
			onclick={() => onModeChange?.('masonry')}
		>
			<PhotosIcon />
		</button>
		<button
			class="mode-button"
			class:selected={mode === 'horizontal'}
			aria-label="Horizontal scroll view"
			onclick={() => onModeChange?.('horizontal')}
		>
			<ViewHorizontalIcon />
		</button>
	</div>

	{#if mode !== 'horizontal'}
		<div class="separator"></div>

		<div class="width-section">
			<button
				class="mode-button"
				class:selected={width === 'normal'}
				aria-label="Normal width"
				onclick={() => onWidthChange?.('normal')}
			>
				<WidthNormalIcon />
			</button>
			<button
				class="mode-button"
				class:selected={width === 'wide'}
				aria-label="Wide width"
				onclick={() => onWidthChange?.('wide')}
			>
				<WidthWideIcon />
			</button>
		</div>
	{/if}
</div>

<style lang="scss">
	.view-mode-selector {
		width: 100%;
		background: $gray-100;
		border-radius: $corner-radius-lg;
		box-sizing: border-box;
		padding: $unit;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: $unit-2x;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

		@include breakpoint('phone') {
			display: none;
		}
	}

	.mode-section,
	.width-section {
		display: flex;
		gap: $unit-half;
	}

	.separator {
		flex: 1;
		min-width: $unit-2x;
	}

	.mode-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		background: transparent;
		border-radius: $corner-radius-sm;
		cursor: pointer;
		transition: all 0.2s ease;
		color: $gray-60;

		&:hover {
			background: $gray-95;
		}

		&.selected {
			color: $red-60;
			background: $salmon-pink;
		}

		:global(svg) {
			width: 20px;
			height: 20px;
		}
	}
</style>
