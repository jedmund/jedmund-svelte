<script lang="ts">
	import { onMount } from 'svelte'
	import { fade } from 'svelte/transition'
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

	function handleBackdropClick() {
		if (closeOnBackdrop) {
			handleClose()
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && closeOnEscape) {
			handleClose()
		}
	}

	// Effect to handle body scroll locking
	$effect(() => {
		if (isOpen) {
			// Save current scroll position
			const scrollY = window.scrollY

			// Lock body scroll
			document.body.style.position = 'fixed'
			document.body.style.top = `-${scrollY}px`
			document.body.style.width = '100%'
			document.body.style.overflow = 'hidden'

			return () => {
				// Restore body scroll
				const scrollY = document.body.style.top
				document.body.style.position = ''
				document.body.style.top = ''
				document.body.style.width = ''
				document.body.style.overflow = ''

				// Restore scroll position
				if (scrollY) {
					window.scrollTo(0, parseInt(scrollY || '0') * -1)
				}
			}
		}
	})

	onMount(() => {
		document.addEventListener('keydown', handleKeydown)
		return () => {
			document.removeEventListener('keydown', handleKeydown)
		}
	})

	let modalClass = $derived(`modal-${size}`)
</script>

{#if isOpen}
	<div class="modal-backdrop" on:click={handleBackdropClick} transition:fade={{ duration: 150 }}>
		<div class="modal {modalClass}" on:click|stopPropagation transition:fade={{ duration: 150 }}>
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
		</div>
	</div>
{/if}

<style lang="scss">
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: $z-index-modal-backdrop;
		padding: $unit-2x;
	}

	.modal {
		background-color: white;
		border-radius: $card-corner-radius;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		position: relative;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;

		&.modal-small {
			width: 100%;
			max-width: 400px;
		}

		&.modal-medium {
			width: 100%;
			max-width: 600px;
		}

		&.modal-large {
			width: 100%;
			max-width: 800px;
		}

		&.modal-jumbo {
			width: 90vw;
			max-width: 1400px;
			height: 80vh;
		}

		&.modal-full {
			width: 100%;
			max-width: 1200px;
			height: 90vh;
		}
	}

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
