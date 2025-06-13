<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { fly } from 'svelte/transition'
	
	interface Props {
		x: number
		y: number
		url: string
		onConvertToCard: () => void
		onEditLink: () => void
		onCopyLink: () => void
		onRemoveLink: () => void
		onOpenLink: () => void
		onDismiss: () => void
	}
	
	let { x, y, url, onConvertToCard, onEditLink, onCopyLink, onRemoveLink, onOpenLink, onDismiss }: Props = $props()
	
	let dropdown: HTMLDivElement
	
	function handleClickOutside(event: MouseEvent) {
		if (dropdown && !dropdown.contains(event.target as Node)) {
			onDismiss()
		}
	}
	
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onDismiss()
		}
	}
	
	onMount(() => {
		document.addEventListener('click', handleClickOutside)
		document.addEventListener('keydown', handleKeydown)
		dropdown?.focus()
	})
	
	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside)
		document.removeEventListener('keydown', handleKeydown)
	})
</script>

<div
	bind:this={dropdown}
	class="link-context-menu"
	style="left: {x}px; top: {y}px;"
	transition:fly={{ y: -10, duration: 200 }}
	tabindex="-1"
>
	<div class="menu-url">{url}</div>
	<div class="menu-divider"></div>
	
	<button class="menu-item" onclick={onOpenLink}>
		Open link
	</button>
	
	<button class="menu-item" onclick={onEditLink}>
		Edit link
	</button>
	
	<button class="menu-item" onclick={onCopyLink}>
		Copy link
	</button>
	
	<button class="menu-item" onclick={onConvertToCard}>
		Convert to card
	</button>
	
	<div class="menu-divider"></div>
	
	<button class="menu-item danger" onclick={onRemoveLink}>
		Remove link
	</button>
</div>

<style lang="scss">
	.link-context-menu {
		position: fixed;
		z-index: 1050;
		background: white;
		border: 1px solid $grey-85;
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
		color: $grey-40;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.menu-divider {
		height: 1px;
		background-color: $grey-90;
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
		color: $grey-20;
		text-align: left;
		transition: background-color 0.2s;
		
		&:hover {
			background-color: $grey-95;
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