<script lang="ts">
	import Button from './Button.svelte'
	import PublishDropdown from './PublishDropdown.svelte'

	interface Props {
		status: 'draft' | 'published' | string
		onSave: (status?: string) => void
		disabled?: boolean
		isLoading?: boolean
		canSave?: boolean
		customActions?: Array<{
			label: string
			status: string
			variant?: 'default' | 'danger'
		}>
	}

	let {
		status,
		onSave,
		disabled = false,
		isLoading = false,
		canSave = true,
		customActions = []
	}: Props = $props()

	function handlePublish() {
		onSave('published')
	}

	function handleSaveDraft() {
		onSave('draft')
	}

	function handleSave() {
		onSave()
	}

	const isDisabled = $derived(disabled || isLoading || !canSave)
</script>

{#if status === 'draft'}
	<PublishDropdown
		onPublish={handlePublish}
		onSaveDraft={handleSaveDraft}
		disabled={isDisabled}
		isLoading={isLoading}
	/>
{:else if status === 'published'}
	<Button
		variant="primary"
		buttonSize="large"
		onclick={handleSave}
		disabled={isDisabled}
	>
		{isLoading ? 'Saving...' : 'Save'}
	</Button>
{:else}
	<!-- For other statuses like 'list-only', 'password-protected', etc. -->
	<Button
		variant="primary"
		buttonSize="large"
		onclick={handleSave}
		disabled={isDisabled}
	>
		{isLoading ? 'Saving...' : 'Save'}
	</Button>
{/if}