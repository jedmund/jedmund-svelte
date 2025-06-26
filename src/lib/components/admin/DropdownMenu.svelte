<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte'
	import { browser } from '$app/environment'
	import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom'
	import ChevronRight from '$icons/chevron-right.svg?component'

	interface Props {
		isOpen: boolean
		triggerElement?: HTMLElement
		items: DropdownItem[]
		onClose?: () => void
		isSubmenu?: boolean
	}

	interface DropdownItem {
		id: string
		label?: string
		action?: () => void
		variant?: 'default' | 'danger'
		divider?: boolean
		children?: DropdownItem[]
		icon?: string
	}

	let { isOpen = $bindable(), triggerElement, items, onClose, isSubmenu = false }: Props = $props()

	let dropdownElement: HTMLDivElement
	let cleanup: (() => void) | null = null
	const dispatch = createEventDispatcher()
	
	// Track which submenu is open
	let openSubmenuId = $state<string | null>(null)
	let submenuElements = $state<Map<string, HTMLElement>>(new Map())
	let submenuCloseTimeout: number | null = null

	// Position state
	let x = $state(0)
	let y = $state(0)
	
	// Action to set submenu references
	function submenuRef(node: HTMLElement, params: { item: DropdownItem; submenuElements: Map<string, HTMLElement> }) {
		if (params.item.children) {
			params.submenuElements.set(params.item.id, node)
		}
		
		return {
			destroy() {
				if (params.item.children) {
					params.submenuElements.delete(params.item.id)
				}
			}
		}
	}

	// Update position using Floating UI
	async function updatePosition() {
		if (!triggerElement || !dropdownElement) return

		const { x: newX, y: newY } = await computePosition(triggerElement, dropdownElement, {
			placement: isSubmenu ? 'right-start' : 'bottom-end',
			middleware: [
				offset(isSubmenu ? 0 : 4),
				flip(),
				shift({ padding: 8 })
			]
		})

		x = newX
		y = newY
	}

	function handleItemClick(item: DropdownItem, event: MouseEvent) {
		event.stopPropagation()
		if (item.action && !item.children) {
			item.action()
			isOpen = false
			openSubmenuId = null  // Reset submenu state
			onClose?.()
		}
	}

	function handleOutsideClick(event: MouseEvent) {
		if (!dropdownElement || !isOpen) return

		const target = event.target as HTMLElement
		// Check if click is inside any submenu
		const clickedInSubmenu = Array.from(submenuElements.values()).some(el => el.contains(target))
		
		if (!dropdownElement.contains(target) && !triggerElement?.contains(target) && !clickedInSubmenu) {
			isOpen = false
			openSubmenuId = null  // Reset submenu state
			onClose?.()
		}
	}
	
	function handleItemMouseEnter(item: DropdownItem) {
		if (submenuCloseTimeout) {
			clearTimeout(submenuCloseTimeout)
			submenuCloseTimeout = null
		}
		
		if (item.children) {
			openSubmenuId = item.id
		} else {
			openSubmenuId = null
		}
	}
	
	function handleItemMouseLeave(item: DropdownItem) {
		if (item.children) {
			// Add delay before closing submenu
			submenuCloseTimeout = window.setTimeout(() => {
				if (openSubmenuId === item.id) {
					openSubmenuId = null
				}
			}, 300)
		}
	}
	
	function handleSubmenuMouseEnter() {
		if (submenuCloseTimeout) {
			clearTimeout(submenuCloseTimeout)
			submenuCloseTimeout = null
		}
	}
	
	function handleSubmenuMouseLeave(itemId: string) {
		submenuCloseTimeout = window.setTimeout(() => {
			if (openSubmenuId === itemId) {
				openSubmenuId = null
			}
		}, 300)
	}

	// Set up auto-update for position when dropdown is open
	$effect(() => {
		if (browser && isOpen && triggerElement && dropdownElement) {
			// Initial position update
			updatePosition()
			
			// Set up auto-update
			cleanup = autoUpdate(triggerElement, dropdownElement, updatePosition)
			
			// Add outside click listener
			document.addEventListener('click', handleOutsideClick)
			
			return () => {
				cleanup?.()
				cleanup = null
				document.removeEventListener('click', handleOutsideClick)
			}
		}
	})
	
	// Reset submenu state when dropdown closes
	$effect(() => {
		if (!isOpen) {
			openSubmenuId = null
		}
	})
</script>

{#if isOpen && browser}
	<div
		bind:this={dropdownElement}
		class="dropdown-menu"
		class:submenu={isSubmenu}
		style="position: fixed; left: {x}px; top: {y}px"
	>
		{#each items as item}
			{#if item.divider}
				<div class="dropdown-divider"></div>
			{:else}
				<button
					use:submenuRef={{ item, submenuElements }}
					class="dropdown-item"
					class:danger={item.variant === 'danger'}
					class:has-children={item.children}
					onclick={(e) => handleItemClick(item, e)}
					onmouseenter={() => handleItemMouseEnter(item)}
					onmouseleave={() => handleItemMouseLeave(item)}
				>
					<span class="item-label">{item.label}</span>
					{#if item.children}
						<span class="submenu-icon">
							<ChevronRight />
						</span>
					{/if}
				</button>
				
				{#if item.children && openSubmenuId === item.id}
					<div
						onmouseenter={handleSubmenuMouseEnter}
						onmouseleave={() => handleSubmenuMouseLeave(item.id)}
					>
						<svelte:self
							isOpen={true}
							triggerElement={submenuElements.get(item.id)}
							items={item.children}
							onClose={onClose}
							isSubmenu={true}
						/>
					</div>
				{/if}
			{/if}
		{/each}
	</div>
{/if}

<style lang="scss">
	@import '$styles/variables.scss';

	.dropdown-menu {
		background: white;
		border: 1px solid $gray-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		min-width: 180px;
		z-index: $z-index-modal;
		max-height: 400px;
		overflow-y: auto;
	}

	.dropdown-item {
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		color: $gray-20;
		cursor: pointer;
		transition: background-color 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: space-between;

		&:hover {
			background-color: $gray-95;
		}

		&.danger {
			color: $red-60;
		}
		
		&.has-children {
			padding-right: $unit-2x;
		}
	}
	
	.item-label {
		flex: 1;
	}
	
	.submenu-icon {
		width: 16px;
		height: 16px;
		margin-left: $unit;
		color: $gray-40;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		
		:global(svg) {
			width: 100%;
			height: 100%;
			fill: none;
		}
		
		:global(path) {
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}

	.dropdown-divider {
		height: 1px;
		background-color: $gray-80;
		margin: $unit-half 0;
	}
</style>
