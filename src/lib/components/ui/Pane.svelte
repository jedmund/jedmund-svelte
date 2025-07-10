<script lang="ts">
	import BasePane from './BasePane.svelte'
	import X from 'lucide-svelte/icons/x'
	import type { Snippet } from 'svelte'

	interface PaneProps {
		isOpen: boolean
		position?: { x: number; y: number } | null
		title?: string
		showCloseButton?: boolean
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
		title,
		showCloseButton = true,
		closeOnBackdrop = true,
		closeOnEscape = true,
		maxWidth = '320px',
		maxHeight = '400px',
		onClose,
		children
	}: PaneProps = $props()

	function handleClose() {
		isOpen = false
		onClose?.()
	}
</script>

<BasePane bind:isOpen {position} {closeOnBackdrop} {closeOnEscape} {maxWidth} {maxHeight} {onClose}>
	{#if title || showCloseButton}
		<div class="pane-header">
			{#if title}
				<h3 class="pane-title">{title}</h3>
			{/if}
			{#if showCloseButton}
				<button class="pane-close" onclick={handleClose} aria-label="Close pane">
					<X size={20} />
				</button>
			{/if}
		</div>
	{/if}

	{#if children}
		{@render children()}
	{/if}
</BasePane>

<style lang="scss">
	@import '$styles/variables';

	.pane-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-2x;
		border-bottom: 1px solid $gray-90;
	}

	.pane-title {
		margin: 0;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-10;
	}

	.pane-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: $unit-4x;
		height: $unit-4x;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: $corner-radius-sm;
		color: $gray-50;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-95;
			color: $gray-30;
		}

		&:focus-visible {
			outline: 2px solid $primary-color;
			outline-offset: 2px;
		}
	}
</style>
