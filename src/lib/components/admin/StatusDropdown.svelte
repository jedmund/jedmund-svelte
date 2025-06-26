<script lang="ts">
	import Button from './Button.svelte'
	import DropdownMenuContainer from './DropdownMenuContainer.svelte'
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
		isDropdownOpen = false
	}

	function handleDropdownAction(status: string) {
		onStatusChange(status)
		isDropdownOpen = false
	}

	function handleDropdownToggle(e: MouseEvent) {
		e.stopPropagation()
		isDropdownOpen = !isDropdownOpen
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.status-dropdown')) {
			isDropdownOpen = false
		}
	}

	$effect(() => {
		if (isDropdownOpen) {
			document.addEventListener('click', handleClickOutside)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	})

	const availableActions = $derived(
		dropdownActions.filter((action) => action.show !== false && action.status !== currentStatus)
	)

	const showViewInDropdown = $derived(viewUrl && currentStatus === 'published')
	const hasDropdownContent = $derived(availableActions.length > 0 || showViewInDropdown)
</script>

<div class="status-dropdown">
	<Button
		variant="primary"
		buttonSize="large"
		onclick={handlePrimaryAction}
		disabled={disabled || isLoading}
	>
		{primaryAction.label}
	</Button>

	{#if hasDropdownContent}
		<Button
			variant="ghost"
			iconOnly
			buttonSize="large"
			onclick={handleDropdownToggle}
			disabled={disabled || isLoading}
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

		{#if isDropdownOpen}
			<DropdownMenuContainer>
				{#each availableActions as action}
					<DropdownItem onclick={() => handleDropdownAction(action.status)}>
						{action.label}
					</DropdownItem>
				{/each}
				{#if showViewInDropdown}
					{#if availableActions.length > 0}
						<div class="dropdown-divider"></div>
					{/if}
					<a
						href={viewUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="dropdown-item view-link"
					>
						View on site
					</a>
				{/if}
			</DropdownMenuContainer>
		{/if}
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.status-dropdown {
		position: relative;
		display: flex;
		gap: $unit-half;
	}

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
		transition: background-color 0.2s ease;
		text-decoration: none;

		&:hover {
			background-color: $gray-95;
		}
	}
</style>
