<script lang="ts">
	import { onMount } from 'svelte'
	import { fade, scale } from 'svelte/transition'

	let {
		images = [],
		selectedIndex = $bindable(0),
		isOpen = $bindable(false),
		alt = ''
	}: {
		images: string[]
		selectedIndex: number
		isOpen: boolean
		alt?: string
	} = $props()

	const close = () => {
		isOpen = false
	}

	const selectImage = (index: number) => {
		selectedIndex = index
	}

	const handleKeydown = (event: KeyboardEvent) => {
		if (!isOpen) return

		switch (event.key) {
			case 'Escape':
				close()
				break
			case 'ArrowLeft':
				if (selectedIndex > 0) {
					selectedIndex--
				}
				break
			case 'ArrowRight':
				if (selectedIndex < images.length - 1) {
					selectedIndex++
				}
				break
		}
	}

	const handleBackgroundClick = (event: MouseEvent) => {
		if (event.target === event.currentTarget) {
			close()
		}
	}

	$effect(() => {
		if (isOpen) {
			// Lock scroll when lightbox opens
			document.body.style.overflow = 'hidden'
		} else {
			// Restore scroll when lightbox closes
			document.body.style.overflow = ''
		}

		// Cleanup on unmount
		return () => {
			document.body.style.overflow = ''
		}
	})

	onMount(() => {
		window.addEventListener('keydown', handleKeydown)

		return () => {
			window.removeEventListener('keydown', handleKeydown)
		}
	})
</script>

{#if isOpen}
	<div
		class="lightbox-backdrop"
		onclick={handleBackgroundClick}
		transition:fade={{ duration: 200 }}
		role="button"
		tabindex="-1"
	>
		<div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
			<div class="lightbox-image-container">
				<img
					src={images[selectedIndex]}
					alt="{alt} {selectedIndex + 1}"
					transition:scale={{ duration: 200, start: 0.9 }}
				/>
			</div>

			{#if images.length > 1}
				<div class="lightbox-thumbnails">
					<div class="thumbnails-inner">
						{#each images as image, index}
							<button
								class="lightbox-thumbnail"
								class:active={index === selectedIndex}
								onclick={() => selectImage(index)}
								aria-label="View image {index + 1}"
							>
								<img src={image} alt="{alt} thumbnail {index + 1}" />
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<button class="lightbox-close" onclick={close} aria-label="Close lightbox">
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M18 6L6 18M6 6l12 12"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</div>
{/if}

<style lang="scss">
	.lightbox-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.9);
		z-index: $z-index-lightbox;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $unit-4x;
		user-select: none;
	}

	.lightbox-content {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.lightbox-image-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		overflow: hidden;
		padding-bottom: 120px; // Space for thumbnails

		img {
			max-width: 90vw;
			max-height: 80vh;
			object-fit: contain;
			user-select: none;
			-webkit-user-drag: none;
		}
	}

	.lightbox-thumbnails {
		position: fixed;
		bottom: $unit-3x; // 24px from bottom
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		justify-content: center;
	}

	.thumbnails-inner {
		display: flex;
		gap: $unit-2x;
		overflow-x: auto;
		max-width: 90vw;
		padding: $unit $unit-2x; // Add vertical padding to prevent clipping

		&::-webkit-scrollbar {
			display: none;
		}
	}

	.lightbox-thumbnail {
		position: relative;
		width: 80px;
		height: 80px;
		flex-shrink: 0;
		border-radius: $unit-2x; // 16px
		overflow: hidden;
		border: none;
		padding: 0;
		background: none;
		cursor: pointer;
		opacity: 0.5;
		transition: all 0.2s ease;

		&::before {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: $unit-2x;
			border: 2px solid transparent;
			z-index: $z-index-above;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&::after {
			content: '';
			position: absolute;
			inset: 2px;
			border-radius: calc($unit-2x - 2px);
			border: 2px solid transparent;
			z-index: $z-index-hover;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&:hover {
			opacity: 1;
			transform: scale(1.05);
		}

		&.active {
			opacity: 1;

			&::before {
				border-color: $red-60;
			}

			&::after {
				border-color: $gray-00; // Black inner border
			}
		}

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			position: relative;
			z-index: $z-index-base;
			user-select: none;
			-webkit-user-drag: none;
		}
	}

	.lightbox-close {
		position: absolute;
		top: $unit-3x;
		right: $unit-3x;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: $gray-100;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		backdrop-filter: blur(10px);

		&:hover {
			background: rgba(255, 255, 255, 0.2);
			transform: scale(1.1);
		}
	}
</style>
