<script lang="ts">
	import type { Snippet } from 'svelte'
	import BaseModal from './BaseModal.svelte'
	import Button from './Button.svelte'
	import CloseButton from '$components/icons/CloseButton.svelte'

	interface Props {
		isOpen: boolean
		size?: 'small' | 'medium' | 'large' | 'jumbo' | 'full'
		closeOnBackdrop?: boolean
		closeOnEscape?: boolean
		showCloseButton?: boolean
		onClose?: () => void
		children?: Snippet
	}

	let {
		isOpen = $bindable(),
		size = 'medium',
		closeOnBackdrop = true,
		closeOnEscape = true,
		showCloseButton = true,
		onClose,
		children
	}: Props = $props()

	function handleClose() {
		isOpen = false
		onClose?.()
	}
</script>

<BaseModal bind:isOpen {size} {closeOnBackdrop} {closeOnEscape} {onClose}>
	{#if showCloseButton}
		<Button
			variant="ghost"
			iconOnly
			onclick={handleClose}
			aria-label="Close modal"
			class="close-button"
		>
			{#snippet icon()}<CloseButton />{/snippet}
		</Button>
	{/if}

	<div class="modal-content">
		{#if children}{@render children()}{/if}
	</div>
</BaseModal>

<style lang="scss">
	:global(.close-button) {
		position: absolute !important;
		top: $unit-2x;
		right: $unit-2x;
		z-index: $z-index-base;
	}

	.modal-content {
		overflow-y: auto;
		flex: 1;
	}
</style>
