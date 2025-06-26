<script lang="ts">
	import BaseModal from './BaseModal.svelte'
	import Button from './Button.svelte'

	interface Props {
		isOpen: boolean
		size?: 'small' | 'medium' | 'large' | 'jumbo' | 'full'
		closeOnBackdrop?: boolean
		closeOnEscape?: boolean
		showCloseButton?: boolean
		onClose?: () => void
	}

	let {
		isOpen = $bindable(),
		size = 'medium',
		closeOnBackdrop = true,
		closeOnEscape = true,
		showCloseButton = true,
		onClose
	}: Props = $props()

	function handleClose() {
		isOpen = false
		onClose?.()
	}
</script>

<BaseModal 
	bind:isOpen 
	{size} 
	{closeOnBackdrop} 
	{closeOnEscape} 
	{onClose}
>
	{#if showCloseButton}
		<Button
			variant="ghost"
			iconOnly
			onclick={handleClose}
			aria-label="Close modal"
			class="close-button"
		>
			<svg
				slot="icon"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M6 6L18 18M6 18L18 6"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
		</Button>
	{/if}

	<div class="modal-content">
		<slot />
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