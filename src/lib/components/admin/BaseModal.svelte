<script lang="ts">
	import { onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import { cubicOut } from 'svelte/easing'

	// Convert CSS transition durations to milliseconds for Svelte transitions
	const TRANSITION_FAST_MS = 150 // $transition-fast: 0.15s

	import type { Snippet } from 'svelte'

	interface Props {
		isOpen: boolean
		size?: 'small' | 'medium' | 'large' | 'jumbo' | 'full' | 'auto'
		closeOnBackdrop?: boolean
		closeOnEscape?: boolean
		onClose?: () => void
		class?: string
		children?: Snippet
		scale?: boolean // Enable scale animation
	}

	let {
		isOpen = $bindable(),
		size = 'medium',
		closeOnBackdrop = true,
		closeOnEscape = true,
		onClose,
		class: className = '',
		children
		scale = false
	}: Props = $props()

	// Animation state management for CSS animations
	let animationState = $state<'entering' | 'open' | 'closing' | 'closed'>('closed')
	const INTRO_DURATION = 200 // matches CSS animation
	const OUTRO_DURATION = 150 // matches CSS animation

	$effect(() => {
		if (isOpen) {
			animationState = 'entering'
			const timer = setTimeout(() => {
				if (isOpen) animationState = 'open'
			}, INTRO_DURATION)
			return () => clearTimeout(timer)
		} else {
			if (animationState === 'open' || animationState === 'entering') {
				animationState = 'closing'
				const timer = setTimeout(() => {
					animationState = 'closed'
				}, OUTRO_DURATION)
				return () => clearTimeout(timer)
			} else {
				animationState = 'closed'
			}
		}
	})

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
		if (event.key === 'Escape' && closeOnEscape && isOpen) {
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

	let modalClass = $derived(`modal modal-${size} ${scale ? 'modal-scale' : ''} ${className}`)
</script>

{#if animationState !== 'closed'}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={handleBackdropClick}
		transition:fade={{ duration: TRANSITION_FAST_MS }}
	>
		<div
			class={modalClass}
			data-state={animationState}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			tabindex="-1"
			role="dialog"
			aria-modal="true"
		>
			{#if children}{@render children()}{/if}
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
		background-color: $overlay-medium;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: $z-index-modal-backdrop;
		padding: $unit-2x;
	}

	.modal {
		background-color: $white;
		border-radius: $card-corner-radius;
		box-shadow: 0 4px 12px $shadow-medium;
		position: relative;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;

		&.modal-auto {
			width: auto;
		}

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

		// Scale animations based on state (like bits-ui)
		&.modal-scale[data-state='entering'],
		&.modal-scale[data-state='open'] {
			animation: modalScaleIn 0.2s cubic-bezier(0.33, 1, 0.68, 1);
		}

		&.modal-scale[data-state='closing'] {
			animation: modalScaleOut 0.15s cubic-bezier(0.33, 1, 0.68, 1);
		}
	}

	@keyframes modalScaleIn {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}

	@keyframes modalScaleOut {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(0.95);
		}
	}
</style>
