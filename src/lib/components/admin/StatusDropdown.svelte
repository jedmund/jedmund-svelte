<script lang="ts">
	import Button from './Button.svelte'
	import BaseDropdown from './BaseDropdown.svelte'
	import DropdownItem from './DropdownItem.svelte'

	interface AltAction {
		label: string
		target: string
	}

	interface Props {
		status: string
		onSave: (target: string) => void
		disabled?: boolean
		isLoading?: boolean
		primaryLabel?: string
		altActions?: AltAction[]
		viewUrl?: string
		onDelete?: () => void
		onCopyPreviewLink?: () => void
		// When provided, the trigger renders as a single text + chevron button (no separate primary action button).
		// Used for the auto-save flow where the status text replaces the manual save button.
		triggerText?: string
	}

	let {
		status,
		onSave,
		disabled = false,
		isLoading = false,
		primaryLabel,
		altActions,
		viewUrl,
		onDelete,
		onCopyPreviewLink,
		triggerText
	}: Props = $props()

	let isDropdownOpen = $state(false)

	const DEFAULTS: Record<string, { primary: string; alt: AltAction[] }> = {
		draft: { primary: 'Save draft', alt: [{ label: 'Publish', target: 'published' }] },
		published: {
			primary: 'Save changes',
			alt: [{ label: 'Move to draft', target: 'draft' }]
		}
	}

	const defaults = $derived(DEFAULTS[status] ?? { primary: 'Save', alt: [] })
	const resolvedPrimaryLabel = $derived(primaryLabel ?? defaults.primary)
	const resolvedAltActions = $derived(altActions ?? defaults.alt)

	const showViewInDropdown = $derived(!!viewUrl && status === 'published')
	const showPreviewLink = $derived(!!onCopyPreviewLink && status === 'draft')
	const hasDropdownContent = $derived(
		resolvedAltActions.length > 0 || showViewInDropdown || showPreviewLink || !!onDelete
	)

	function handlePrimary() {
		onSave(status)
	}

	function handleAlt(target: string) {
		onSave(target)
		isDropdownOpen = false
	}

	function handleDelete() {
		onDelete?.()
		isDropdownOpen = false
	}
</script>

<BaseDropdown
	bind:isOpen={isDropdownOpen}
	{disabled}
	{isLoading}
	class="status-dropdown"
	combined={triggerText !== undefined}
>
	{#snippet trigger(toggle)}
		{#if triggerText !== undefined}
			<button
				type="button"
				class="combined-trigger"
				onclick={toggle}
				disabled={disabled || isLoading}
			>
				<span class="combined-trigger__label">{triggerText}</span>
				<svg
					class="combined-trigger__chevron"
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
					aria-hidden="true"
				>
					<path
						d="M3 4.5L6 7.5L9 4.5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		{:else}
			<Button
				variant="primary"
				buttonSize="medium"
				onclick={handlePrimary}
				disabled={disabled || isLoading}
			>
				{#snippet children()}
					{resolvedPrimaryLabel}
				{/snippet}
			</Button>
		{/if}
	{/snippet}

	{#snippet dropdown()}
		{#if hasDropdownContent}
			{#each resolvedAltActions as action (action.target)}
				<DropdownItem onclick={() => handleAlt(action.target)}>
					{action.label}
				</DropdownItem>
			{/each}
			{#if showPreviewLink}
				{#if resolvedAltActions.length > 0}
					<div class="dropdown-divider"></div>
				{/if}
				<button
					type="button"
					class="dropdown-item view-link"
					onclick={() => {
						onCopyPreviewLink?.()
						isDropdownOpen = false
					}}
				>
					Copy preview link
				</button>
			{/if}
			{#if showViewInDropdown}
				{#if resolvedAltActions.length > 0 || showPreviewLink}
					<div class="dropdown-divider"></div>
				{/if}
				<a href={viewUrl} target="_blank" rel="noopener noreferrer" class="dropdown-item view-link">
					View on site
				</a>
			{/if}
			{#if onDelete}
				{#if resolvedAltActions.length > 0 || showViewInDropdown || showPreviewLink}
					<div class="dropdown-divider"></div>
				{/if}
				<button type="button" class="dropdown-item delete-item" onclick={handleDelete}>
					Delete
				</button>
			{/if}
		{/if}
	{/snippet}
</BaseDropdown>

<style lang="scss">
	.combined-trigger {
		display: inline-flex;
		align-items: center;
		gap: $unit-2x;
		padding: $unit $unit-2x;
		background: $gray-95;
		border: 1px solid $gray-90;
		border-radius: 50px;
		font-size: 0.875rem;
		color: $gray-20;
		cursor: pointer;
		transition:
			background-color $transition-normal ease,
			border-color $transition-normal ease;

		&:hover:not(:disabled) {
			background: $gray-90;
			border-color: $gray-85;
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.combined-trigger__label {
		white-space: nowrap;
	}

	.combined-trigger__chevron {
		flex-shrink: 0;
		opacity: 0.6;
	}

	.dropdown-divider {
		height: 1px;
		background-color: $gray-80;
		margin: $unit-half 0;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color $transition-normal ease;

		&.view-link {
			color: $gray-20;
			text-decoration: none;

			&:hover {
				background-color: $gray-95;
			}
		}

		&.delete-item {
			color: #c53030;
			font-weight: 500;

			&:hover {
				background-color: #fff5f5;
			}
		}
	}
</style>
