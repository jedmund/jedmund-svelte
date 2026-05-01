<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { fly } from 'svelte/transition'
	import { computePosition, flip, offset, shift, type Placement } from '@floating-ui/dom'

	// Convert CSS transition durations to milliseconds for Svelte transitions
	const TRANSITION_NORMAL_MS = 200 // $transition-normal: 0.2s

	interface Props {
		x: number
		y: number
		url: string
		onConvertToLink: () => void
		onCopyLink: () => void
		onRefresh: () => void
		onOpenLink: () => void
		onRemove: () => void
		onDismiss: () => void
	}

	let {
		x,
		y,
		url,
		onConvertToLink,
		onCopyLink,
		onRefresh,
		onOpenLink,
		onRemove,
		onDismiss
	}: Props = $props()

	let dropdown: HTMLDivElement
	let menuX = $state(x)
	let menuY = $state(y)
	let positioned = $state(false)

	function handleClickOutside(event: MouseEvent) {
		if (dropdown && !dropdown.contains(event.target as Node)) {
			onDismiss()
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault()
			onDismiss()
			return
		}

		const buttons = Array.from(dropdown?.querySelectorAll<HTMLButtonElement>('.menu-item') ?? [])
		if (!buttons.length) return
		const current = buttons.indexOf(document.activeElement as HTMLButtonElement)

		if (event.key === 'ArrowDown') {
			event.preventDefault()
			buttons[current < 0 ? 0 : (current + 1) % buttons.length].focus()
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			buttons[current <= 0 ? buttons.length - 1 : current - 1].focus()
		} else if (event.key === 'Home') {
			event.preventDefault()
			buttons[0].focus()
		} else if (event.key === 'End') {
			event.preventDefault()
			buttons[buttons.length - 1].focus()
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
		position()
		dropdown?.focus()
	})

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside)
	})
</script>

<div
	bind:this={dropdown}
	class="embed-context-menu"
	style:left="{menuX}px"
	style:top="{menuY}px"
	style:visibility={positioned ? 'visible' : 'hidden'}
	onkeydown={handleKeydown}
	transition:fly={{ y: -10, duration: TRANSITION_NORMAL_MS }}
	role="menu"
	tabindex="-1"
>
	<div class="menu-url">{url}</div>
	<div class="menu-divider"></div>

	<button class="menu-item" role="menuitem" onclick={onOpenLink}> Open link </button>

	<button class="menu-item" role="menuitem" onclick={onCopyLink}> Copy link </button>

	<button class="menu-item" role="menuitem" onclick={onRefresh}> Refresh preview </button>

	<button class="menu-item" role="menuitem" onclick={onConvertToLink}> Convert to link </button>

	<div class="menu-divider"></div>

	<button class="menu-item danger" role="menuitem" onclick={onRemove}> Remove card </button>
</div>

<style lang="scss">
	.embed-context-menu {
		position: fixed;
		z-index: 1050;
		background: white;
		border: 1px solid $gray-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		padding: 4px;
		outline: none;
		min-width: 200px;
		max-width: 300px;
	}

	.menu-url {
		padding: $unit $unit-2x;
		font-size: 0.75rem;
		color: $gray-40;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.menu-divider {
		height: 1px;
		background-color: $gray-90;
		margin: 4px 0;
	}

	.menu-item {
		display: block;
		width: 100%;
		padding: $unit $unit-2x;
		background: transparent;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		color: $gray-20;
		text-align: left;
		transition: background-color 0.2s;

		&:hover {
			background-color: $gray-95;
		}

		&:focus {
			outline: 2px solid $red-60;
			outline-offset: -2px;
		}

		&.danger {
			color: $red-60;
		}
	}
</style>
