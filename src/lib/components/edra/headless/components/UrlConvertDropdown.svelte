<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { fly } from 'svelte/transition'
	import { computePosition, flip, offset, shift, type Placement } from '@floating-ui/dom'

	// Convert CSS transition durations to milliseconds for Svelte transitions
	const TRANSITION_NORMAL_MS = 200 // $transition-normal: 0.2s

	interface Props {
		x: number
		y: number
		onConvert: () => void
		onDismiss: () => void
	}

	let { x, y, onConvert, onDismiss }: Props = $props()

	let dropdown: HTMLDivElement
	let menuX = $state(x)
	let menuY = $state(y)
	let positioned = $state(false)

	function handleConvert() {
		onConvert()
	}

	function handleClickOutside(event: MouseEvent) {
		if (dropdown && !dropdown.contains(event.target as Node)) {
			onDismiss()
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onDismiss()
		} else if (event.key === 'Enter') {
			handleConvert()
		}
	}

	async function position() {
		if (!dropdown) return
		const virtualEl = {
			getBoundingClientRect: () =>
				({
					x,
					y,
					top: y,
					left: x,
					right: x,
					bottom: y,
					width: 0,
					height: 0,
					toJSON: () => ({})
				}) as DOMRect
		}
		const { x: nx, y: ny } = await computePosition(virtualEl, dropdown, {
			placement: 'bottom-start' as Placement,
			middleware: [
				offset(0),
				flip({ fallbackPlacements: ['bottom-end', 'top-start', 'top-end'] }),
				shift({ padding: 8 })
			]
		})
		menuX = nx
		menuY = ny
		positioned = true
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside)
		document.addEventListener('keydown', handleKeydown)
		position()
		// Don't focus the dropdown - this steals focus from the editor
	})

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside)
		document.removeEventListener('keydown', handleKeydown)
	})
</script>

<div
	bind:this={dropdown}
	class="url-convert-dropdown"
	style:left="{menuX}px"
	style:top="{menuY}px"
	style:visibility={positioned ? 'visible' : 'hidden'}
	transition:fly={{ y: -10, duration: TRANSITION_NORMAL_MS }}
	tabindex="-1"
>
	<button class="convert-button" onclick={handleConvert}> Convert to card </button>
</div>

<style lang="scss">
	.url-convert-dropdown {
		position: fixed;
		z-index: 1050;
		background: white;
		border: 1px solid $gray-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		padding: 4px;
		outline: none;
		min-width: 160px;
	}

	.convert-button {
		display: block;
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: transparent;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		color: $gray-20;
		white-space: nowrap;
		transition: background-color 0.2s;
		text-align: left;

		&:hover {
			background-color: $gray-95;
		}

		&:focus {
			outline: 2px solid $red-60;
			outline-offset: -2px;
		}
	}
</style>
