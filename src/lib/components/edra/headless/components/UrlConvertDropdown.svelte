<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { fly } from 'svelte/transition'

	interface Props {
		x: number
		y: number
		onConvert: () => void
		onDismiss: () => void
	}

	let { x, y, onConvert, onDismiss }: Props = $props()

	let dropdown: HTMLDivElement

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

	onMount(() => {
		// Add event listeners
		document.addEventListener('click', handleClickOutside)
		document.addEventListener('keydown', handleKeydown)

		// Don't focus the dropdown - this steals focus from the editor
		// dropdown?.focus()
	})

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside)
		document.removeEventListener('keydown', handleKeydown)
	})
</script>

<div
	bind:this={dropdown}
	class="url-convert-dropdown"
	style="left: {x}px; top: {y}px;"
	transition:fly={{ y: -10, duration: 200 }}
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
