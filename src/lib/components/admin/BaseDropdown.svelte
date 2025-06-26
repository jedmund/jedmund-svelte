<script lang="ts">
	import Button from './Button.svelte'
	import DropdownMenuContainer from './DropdownMenuContainer.svelte'

	interface Props {
		isOpen?: boolean
		disabled?: boolean
		isLoading?: boolean
		dropdownTriggerSize?: 'small' | 'medium' | 'large'
		class?: string
		onToggle?: (isOpen: boolean) => void
	}

	let {
		isOpen = $bindable(false),
		disabled = false,
		isLoading = false,
		dropdownTriggerSize = 'large',
		class: className = '',
		onToggle
	}: Props = $props()

	function handleDropdownToggle(e: MouseEvent) {
		e.stopPropagation()
		isOpen = !isOpen
		onToggle?.(isOpen)
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest(`.${className}`) && !target.closest('.dropdown-container')) {
			isOpen = false
			onToggle?.(false)
		}
	}

	$effect(() => {
		if (isOpen) {
			// Use setTimeout to avoid immediate closing when clicking the trigger
			setTimeout(() => {
				document.addEventListener('click', handleClickOutside)
			}, 0)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	})
</script>

<div class="dropdown-container {className}">
	<div class="dropdown-trigger">
		<slot name="trigger" />
		
		{#if $$slots.dropdown}
			<Button
				variant="ghost"
				iconOnly
				buttonSize={dropdownTriggerSize}
				onclick={handleDropdownToggle}
				{disabled}
				{isLoading}
				class="dropdown-toggle"
			>
				<svg slot="icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path
						d="M3 4.5L6 7.5L9 4.5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</Button>
		{/if}
	</div>

	{#if isOpen && $$slots.dropdown}
		<DropdownMenuContainer>
			<slot name="dropdown" />
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