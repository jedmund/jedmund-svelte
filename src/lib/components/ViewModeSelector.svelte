<script lang="ts">
	import { getContext } from 'svelte'
	import PhotosIcon from '$icons/photos.svg?component'
	import WidthNormalIcon from '$icons/width-normal.svg?component'
	import WidthWideIcon from '$icons/width-wide.svg?component'

	interface Props {
		mode?: 'masonry'
		width?: 'normal' | 'wide'
		onWidthChange?: (width: 'normal' | 'wide') => void
	}

	let { 
		mode = 'masonry',
		width = 'normal',
		onWidthChange
	}: Props = $props()
</script>

<div class="view-mode-selector">
	<div class="mode-section">
		<button class="mode-button selected" aria-label="Masonry view">
			<PhotosIcon />
		</button>
	</div>
	
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
</div>

<style lang="scss">
	.view-mode-selector {
		width: 100%;
		background: $grey-100;
		border-radius: $corner-radius-lg;
		box-sizing: border-box;
		padding: $unit;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: $unit-2x;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
		color: $grey-60;

		&:hover {
			background: $grey-95;
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
