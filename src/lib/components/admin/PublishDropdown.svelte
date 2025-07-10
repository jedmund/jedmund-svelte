<script lang="ts">
	import Button from './Button.svelte'
	import BaseDropdown from './BaseDropdown.svelte'
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
	}

	function handleSaveDraftClick() {
		onSaveDraft()
		isDropdownOpen = false
	}
</script>

<BaseDropdown bind:isOpen={isDropdownOpen} {disabled} {isLoading} class="publish-dropdown">
	{#snippet trigger()}
		<Button
			variant="primary"
			buttonSize="large"
			onclick={handlePublishClick}
			disabled={disabled || isLoading}
		>
			{isLoading ? loadingText : publishText}
		</Button>
	{/snippet}

	{#if showDropdown}
		{#snippet dropdown()}
			<DropdownItem onclick={handleSaveDraftClick}>
				{saveDraftText}
			</DropdownItem>
		{/snippet}
	{/if}
</BaseDropdown>
