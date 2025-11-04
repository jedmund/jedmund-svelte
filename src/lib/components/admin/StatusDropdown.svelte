<script lang="ts">
	import Button from './Button.svelte'
	import BaseDropdown from './BaseDropdown.svelte'
	import DropdownItem from './DropdownItem.svelte'

	interface Props {
		currentStatus: string
		onStatusChange: (status: string) => void
		disabled?: boolean
		isLoading?: boolean
		primaryAction: {
			label: string
			status: string
		}
		dropdownActions?: Array<{
			label: string
			status: string
			show?: boolean
		}>
		viewUrl?: string
	}

	let {
		currentStatus,
		onStatusChange,
		disabled = false,
		isLoading = false,
		primaryAction,
		dropdownActions = [],
		viewUrl
	}: Props = $props()

	let isDropdownOpen = $state(false)

	function handlePrimaryAction() {
		onStatusChange(primaryAction.status)
	}

	function handleDropdownAction(status: string) {
		onStatusChange(status)
		isDropdownOpen = false
	}

	const availableActions = $derived(
		dropdownActions.filter((action) => action.show !== false && action.status !== currentStatus)
	)

	const showViewInDropdown = $derived(viewUrl && currentStatus === 'published')
	const hasDropdownContent = $derived(availableActions.length > 0 || showViewInDropdown)
</script>

<BaseDropdown bind:isOpen={isDropdownOpen} {disabled} {isLoading} class="status-dropdown">
	{#snippet trigger()}
		<Button
			variant="primary"
			buttonSize="medium"
			onclick={handlePrimaryAction}
			disabled={disabled || isLoading}
		>
			{#snippet children()}
				{primaryAction.label}
			{/snippet}
		</Button>
	{/snippet}

	{#snippet dropdown()}
		{#if hasDropdownContent}
			{#each availableActions as action}
				<DropdownItem onclick={() => handleDropdownAction(action.status)}>
					{action.label}
				</DropdownItem>
			{/each}
			{#if showViewInDropdown}
				{#if availableActions.length > 0}
					<div class="dropdown-divider"></div>
				{/if}
				<a href={viewUrl} target="_blank" rel="noopener noreferrer" class="dropdown-item view-link">
					View on site
				</a>
			{/if}
		{/if}
	{/snippet}
</BaseDropdown>

<style lang="scss">
	.dropdown-divider {
		height: 1px;
		background-color: $gray-80;
		margin: $unit-half 0;
	}

	.dropdown-item.view-link {
		display: block;
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		color: $gray-20;
		cursor: pointer;
		transition: background-color $transition-normal ease;
		text-decoration: none;

		&:hover {
			background-color: $gray-95;
		}
	}
</style>
