<script lang="ts">
	import ArrowLeft from '$icons/arrow-left.svg?component'
	import ArrowRight from '$icons/arrow-right.svg?component'
	import type { PhotoItem } from '$lib/types/photos'
	let {
		prev,
		next,
		hoveringLeft,
		hoveringRight,
		leftCoords,
		rightCoords,
		navigateToPhoto
	}: {
		prev: PhotoItem | null
		next: PhotoItem | null
		hoveringLeft: boolean
		hoveringRight: boolean
		leftCoords: { x: number; y: number }
		rightCoords: { x: number; y: number }
		navigateToPhoto: (photo: PhotoItem | null) => void
	} = $props()
</script>

<!-- Static prev/next for touch devices (floating buttons are desktop-only) -->
{#if prev || next}
	<nav class="mobile-photo-nav" aria-label="Photo navigation">
		<button
			class="mobile-nav-button"
			type="button"
			disabled={!prev}
			onclick={() => navigateToPhoto(prev)}
			aria-label="Previous photo"
		>
			<ArrowLeft />
		</button>
		<button
			class="mobile-nav-button"
			type="button"
			disabled={!next}
			onclick={() => navigateToPhoto(next)}
			aria-label="Next photo"
		>
			<ArrowRight />
		</button>
	</nav>
{/if}

<!-- Adjacent Photos Navigation -->
<div class="adjacent-navigation">
	{#if prev}
		<button
			class="nav-button prev"
			class:hovering={hoveringLeft}
			style="
						left: {leftCoords.x}px;
						top: {leftCoords.y}px;
						transform: translate(-50%, -50%);
					"
			onclick={() => navigateToPhoto(prev)}
			type="button"
			aria-label="Previous photo"
		>
			<ArrowLeft class="nav-icon" />
		</button>
	{/if}

	{#if next}
		<button
			class="nav-button next"
			class:hovering={hoveringRight}
			style="
						left: {rightCoords.x}px;
						top: {rightCoords.y}px;
						transform: translate(-50%, -50%);
					"
			onclick={() => navigateToPhoto(next)}
			type="button"
			aria-label="Next photo"
		>
			<ArrowRight class="nav-icon" />
		</button>
	{/if}
</div>

<style lang="scss">
	.adjacent-navigation {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		pointer-events: none;
		z-index: 100;

		// Hide on mobile and tablet
		@include breakpoint('tablet') {
			display: none;
		}
	}

	// Static touch navigation — shown where the floating buttons are hidden
	.mobile-photo-nav {
		display: none;
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
		justify-content: space-between;

		@include breakpoint('tablet') {
			display: flex;
		}
	}

	.mobile-nav-button {
		width: 44px;
		height: 44px;
		border: none;
		padding: 0;
		background: $gray-95;
		cursor: pointer;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;

		&:disabled {
			opacity: 0.35;
			cursor: default;
		}

		:global(svg) {
			stroke: $gray-10;
			width: 16px;
			height: 16px;
			fill: none;
			stroke-width: 2px;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}

	.nav-button {
		width: 48px;
		height: 48px;
		pointer-events: auto;
		position: absolute;
		border: none;
		padding: 0;
		background: $gray-100;
		cursor: pointer;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background 0.2s ease,
			box-shadow 0.2s ease;

		&:hover {
			background: $gray-95;
		}

		&.hovering {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

			&:hover {
				box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
			}
		}

		&:focus-visible {
			outline: none;
			box-shadow:
				0 0 0 3px $red-60,
				0 0 0 5px $gray-100;
		}

		:global(svg) {
			stroke: $gray-10;
			width: 16px;
			height: 16px;
			fill: none;
			stroke-width: 2px;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}
</style>
