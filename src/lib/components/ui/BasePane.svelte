<script lang="ts">
	import { fade } from 'svelte/transition'
	import { clickOutside } from '$lib/actions/clickOutside'
	import type { Snippet } from 'svelte'

	interface BasePaneProps {
		isOpen: boolean
		position?: { x: number; y: number } | null
		closeOnBackdrop?: boolean
		closeOnEscape?: boolean
		maxWidth?: string
		maxHeight?: string
		onClose?: () => void
		children?: Snippet
	}

	let {
		isOpen = $bindable(false),
		position = null,
		closeOnBackdrop = true,
		closeOnEscape = true,
		maxWidth = '320px',
		maxHeight = '400px',
		onClose,
		children
	}: BasePaneProps = $props()

	let paneElement: HTMLDivElement

	// Handle escape key
	$effect(() => {
		if (!isOpen || !closeOnEscape) return

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				handleClose()
			}
		}

		window.addEventListener('keydown', handleKeydown)
		return () => window.removeEventListener('keydown', handleKeydown)
	})

	function handleClose() {
		isOpen = false
		onClose?.()
	}

	// State to store calculated position
	let calculatedPosition = $state<{ x: number; y: number } | null>(null)

	// Calculate viewport-aware position
	$effect(() => {
		if (!position || !paneElement || !isOpen) {
			calculatedPosition = null
			return
		}

		// Get pane dimensions
		const paneRect = paneElement.getBoundingClientRect()
		const paneWidth = paneRect.width
		const paneHeight = paneRect.height

		// Get viewport dimensions
		const viewportWidth = window.innerWidth
		const viewportHeight = window.innerHeight

		// Calculate position with viewport awareness
		let x = position.x
		let y = position.y

		// Check horizontal bounds
		if (x + paneWidth > viewportWidth - 20) {
			// Too close to right edge, align to right
			x = viewportWidth - paneWidth - 20
		}
		if (x < 20) {
			// Too close to left edge
			x = 20
		}

		// Check vertical bounds
		if (y + paneHeight > viewportHeight - 20) {
			// Too close to bottom edge, show above the cursor instead
			// Assuming the cursor is at position.y, we want to show above it
			y = Math.max(20, position.y - paneHeight - 8)
		}
		if (y < 20) {
			// Too close to top edge
			y = 20
		}

		calculatedPosition = { x, y }
	})

	// Calculate position styles
	const positionStyles = $derived(() => {
		const pos = calculatedPosition || position
		if (!pos) return ''

		let styles = []

		// Position the pane at the calculated coordinates
		styles.push(`left: ${pos.x}px`)
		styles.push(`top: ${pos.y}px`)

		return styles.join('; ')
	})
</script>

{#if isOpen}
	<div
		class="base-pane"
		bind:this={paneElement}
		style="{positionStyles()}; max-width: {maxWidth}; max-height: {maxHeight};"
		transition:fade={{ duration: 150 }}
		role="dialog"
		aria-modal="false"
		use:clickOutside={{ enabled: closeOnBackdrop }}
		on:clickoutside={handleClose}
	>
		{#if children}
			{@render children()}
		{/if}
	</div>
{/if}

<style lang="scss">
	@import '$styles/variables';

	.base-pane {
		position: fixed;
		background: $white;
		border: 1px solid $gray-85;
		border-radius: $corner-radius;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06),
			0 10px 15px -3px rgba(0, 0, 0, 0.1);
		z-index: $z-index-popover;
		min-width: 400px;
		overflow: auto;

		// Ensure pane doesn't go off-screen
		&:global([style*='left']) {
			transform: translateX(0);

			// If it would go off the right edge, align to right instead
			@media (max-width: 640px) {
				left: auto !important;
				right: $unit !important;
			}
		}
	}
</style>
