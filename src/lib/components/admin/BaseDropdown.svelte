<script lang="ts">
	import type { Snippet } from 'svelte'
	import Button from './Button.svelte'
	import DropdownMenuContainer from './DropdownMenuContainer.svelte'
	import { clickOutside } from '$lib/actions/clickOutside'

	interface Props {
		isOpen?: boolean
		disabled?: boolean
		isLoading?: boolean
		dropdownTriggerSize?: 'small' | 'medium' | 'large'
		class?: string
		onToggle?: (isOpen: boolean) => void
		trigger: Snippet
		dropdown?: Snippet
	}

	let {
		isOpen = $bindable(false),
		disabled = false,
		isLoading = false,
		dropdownTriggerSize = 'large',
		class: className = '',
		onToggle,
		trigger,
		dropdown
	}: Props = $props()

	function handleDropdownToggle(e: MouseEvent) {
		e.stopPropagation()
		isOpen = !isOpen
		onToggle?.(isOpen)
	}

	function handleClickOutside() {
		isOpen = false
		onToggle?.(false)
	}
</script>

<div
	class="dropdown-container {className}"
	use:clickOutside={{ enabled: isOpen }}
	on:clickoutside={handleClickOutside}
>
	<div class="dropdown-trigger">
		{@render trigger()}

		{#if dropdown}
			<Button
				variant="ghost"
				iconOnly
				buttonSize={dropdownTriggerSize}
				onclick={handleDropdownToggle}
				{disabled}
				{isLoading}
				class="dropdown-toggle"
			>
				{#snippet icon()}
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
						<path
							d="M3 4.5L6 7.5L9 4.5"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{/snippet}
			</Button>
		{/if}
	</div>

	{#if isOpen && dropdown}
		<DropdownMenuContainer>
			{@render dropdown()}
		</DropdownMenuContainer>
	{/if}
</div>

<style lang="scss">
	.dropdown-container {
		position: relative;
		display: inline-block;
	}

	.dropdown-trigger {
		display: flex;
		gap: $unit-half;
	}

	:global(.dropdown-toggle) {
		flex-shrink: 0;
	}
</style>
