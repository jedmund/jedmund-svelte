<script lang="ts">
	import { clickOutside } from '$lib/actions/clickOutside'
	import DropdownItem from './DropdownItem.svelte'
	import DropdownMenuContainer from './DropdownMenuContainer.svelte'

	interface Props {
		currentStatus: 'draft' | 'published' | 'list-only' | 'password-protected'
		onChange: (status: string) => void
		disabled?: boolean
		viewUrl?: string
	}

	let { currentStatus, onChange, disabled = false, viewUrl }: Props = $props()

	let isOpen = $state(false)

	function handleStatusChange(status: string) {
		onChange(status)
		isOpen = false
	}

	function handleClickOutside() {
		isOpen = false
	}

	const statusConfig = {
		draft: {
			label: 'Draft',
			color: 'var(--status-draft, #f59e0b)'
		},
		published: {
			label: 'Published',
			color: 'var(--status-published, #10b981)'
		},
		'list-only': {
			label: 'List Only',
			color: 'var(--status-list-only, #3b82f6)'
		},
		'password-protected': {
			label: 'Password Protected',
			color: 'var(--status-password, #f97316)'
		}
	} as const

	const currentConfig = $derived(statusConfig[currentStatus])

	const availableStatuses = [
		{ value: 'draft', label: 'Draft' },
		{ value: 'published', label: 'Published' },
		{ value: 'list-only', label: 'List Only' },
		{ value: 'password-protected', label: 'Password Protected' }
	]
</script>

<div
	class="status-picker"
	use:clickOutside={{ enabled: isOpen }}
	onclickoutside={handleClickOutside}
>
	<button
		class="status-badge"
		class:disabled
		style="--status-color: {currentConfig.color}"
		onclick={() => !disabled && (isOpen = !isOpen)}
		type="button"
	>
		<span class="status-dot"></span>
		<span class="status-label">{currentConfig.label}</span>
		<svg class="chevron" class:open={isOpen} width="12" height="12" viewBox="0 0 12 12" fill="none">
			<path
				d="M3 4.5L6 7.5L9 4.5"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	{#if isOpen}
		<DropdownMenuContainer>
			{#each availableStatuses as status}
				{#if status.value !== currentStatus}
					<DropdownItem onclick={() => handleStatusChange(status.value)}>
						{status.label}
					</DropdownItem>
				{/if}
			{/each}

			{#if viewUrl && currentStatus === 'published'}
				<div class="dropdown-divider"></div>
				<a href={viewUrl} target="_blank" rel="noopener noreferrer" class="dropdown-item view-link">
					View on site
				</a>
			{/if}
		</DropdownMenuContainer>
	{/if}
</div>

<style lang="scss">
	.status-picker {
		position: relative;
		display: inline-block;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit-half $unit-2x;
		background: transparent;
		border: 1px solid $gray-70;
		border-radius: $corner-radius-full;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--status-color);
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;

		&:hover:not(.disabled) {
			background: $gray-95;
			border-color: $gray-60;
		}

		&.disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		flex-shrink: 0;
	}

	.status-label {
		line-height: 1;
	}

	.chevron {
		flex-shrink: 0;
		transition: transform 0.2s ease;
		color: $gray-40;

		&.open {
			transform: rotate(180deg);
		}
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
		transition: background-color $transition-normal ease;
		text-decoration: none;

		&:hover {
			background-color: $gray-95;
		}
	}
</style>
