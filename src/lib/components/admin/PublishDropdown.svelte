<script lang="ts">
	import Button from './Button.svelte'
	import DropdownMenuContainer from './DropdownMenuContainer.svelte'
	import DropdownItem from './DropdownItem.svelte'

	interface Props {
		onPublish: () => void
		onSaveDraft: () => void
		disabled?: boolean
		isLoading?: boolean
		publishText?: string
		saveDraftText?: string
		loadingText?: string
		showDropdown?: boolean
	}

	let {
		onPublish,
		onSaveDraft,
		disabled = false,
		isLoading = false,
		publishText = 'Publish',
		saveDraftText = 'Save as Draft',
		loadingText = 'Publishing...',
		showDropdown = true
	}: Props = $props()

	let isDropdownOpen = $state(false)

	function handlePublishClick() {
		onPublish()
		isDropdownOpen = false
	}

	function handleSaveDraftClick() {
		onSaveDraft()
		isDropdownOpen = false
	}

	function handleDropdownToggle(e: MouseEvent) {
		e.stopPropagation()
		isDropdownOpen = !isDropdownOpen
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.publish-dropdown')) {
			isDropdownOpen = false
		}
	}

	$effect(() => {
		if (isDropdownOpen) {
			document.addEventListener('click', handleClickOutside)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	})
</script>

<div class="publish-dropdown">
	<Button
		variant="primary"
		buttonSize="large"
		onclick={handlePublishClick}
		disabled={disabled || isLoading}
	>
		{isLoading ? loadingText : publishText}
	</Button>

	{#if showDropdown}
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
				<DropdownItem onclick={handleSaveDraftClick}>
					{saveDraftText}
				</DropdownItem>
			</DropdownMenuContainer>
		{/if}
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.publish-dropdown {
		position: relative;
		display: flex;
		gap: $unit-half;
	}
</style>
