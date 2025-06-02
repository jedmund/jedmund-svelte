<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte'
	import { browser } from '$app/environment'

	interface Props {
		isOpen: boolean
		triggerElement?: HTMLElement
		items: DropdownItem[]
		onClose?: () => void
	}

	interface DropdownItem {
		id: string
		label: string
		action: () => void
		variant?: 'default' | 'danger'
		divider?: boolean
	}

	let { isOpen = $bindable(), triggerElement, items, onClose }: Props = $props()

	let dropdownElement: HTMLDivElement
	const dispatch = createEventDispatcher()

	// Calculate position dynamically when needed
	const position = $derived(() => {
		if (!isOpen || !triggerElement || !browser) {
			return { top: 0, left: 0 }
		}

		const rect = triggerElement.getBoundingClientRect()
		const dropdownWidth = 180

		return {
			top: rect.bottom + 4,
			left: rect.right - dropdownWidth
		}
	})

	function handleItemClick(item: DropdownItem, event: MouseEvent) {
		event.stopPropagation()
		item.action()
		isOpen = false
		onClose?.()
	}

	function handleOutsideClick(event: MouseEvent) {
		if (!dropdownElement || !isOpen) return

		const target = event.target as HTMLElement
		if (!dropdownElement.contains(target) && !triggerElement?.contains(target)) {
			isOpen = false
			onClose?.()
		}
	}

	$effect(() => {
		if (browser && isOpen) {
			document.addEventListener('click', handleOutsideClick)
			return () => {
				document.removeEventListener('click', handleOutsideClick)
			}
		}
	})
</script>

{#if isOpen && browser}
	<div
		bind:this={dropdownElement}
		class="dropdown-menu"
		style="top: {position().top}px; left: {position().left}px"
	>
		{#each items as item}
			{#if item.divider}
				<div class="dropdown-divider"></div>
			{:else}
				<button
					class="dropdown-item"
					class:danger={item.variant === 'danger'}
					onclick={(e) => handleItemClick(item, e)}
				>
					{item.label}
				</button>
			{/if}
		{/each}
	</div>
{/if}

<style lang="scss">
	@import '$styles/variables.scss';

	.dropdown-menu {
		position: fixed;
		background: white;
		border: 1px solid $grey-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		min-width: 180px;
		z-index: 1000;
	}

	.dropdown-item {
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		color: $grey-20;
		cursor: pointer;
		transition: background-color 0.2s ease;
		display: block;

		&:hover {
			background-color: $grey-95;
		}

		&.danger {
			color: $red-60;
		}
	}

	.dropdown-divider {
		height: 1px;
		background-color: $grey-90;
		margin: $unit-half 0;
	}
</style>
