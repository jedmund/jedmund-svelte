<script lang="ts">
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import type { SyndicationRecord } from '$lib/admin/syndication/requests'
	let {
		isOpen = $bindable(false),
		url = $bindable(''),
		platform,
		record,
		saving,
		onsave,
		onclose
	}: {
		isOpen?: boolean
		url?: string
		platform: string | null
		record: SyndicationRecord | null
		saving: boolean
		onsave: () => void
		onclose: () => void
	} = $props()
</script>

<Modal bind:isOpen size="medium" onClose={onclose}>
	<div class="link-modal">
		<h3 class="link-modal-title">
			{record ? 'Edit' : 'Add'}
			{platform === 'bluesky' ? 'Bluesky' : 'Mastodon'} link
		</h3>
		<Input bind:value={url} placeholder="https://..." />
		<div class="link-modal-actions">
			<Button variant="secondary" onclick={onclose}>Cancel</Button>
			<Button variant="primary" onclick={onsave} disabled={saving || !url.trim()}>Save</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	.link-modal {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		padding: $unit-4x;
	}

	.link-modal-title {
		margin: 0;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-20;
	}

	.link-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: $unit-2x;
	}
</style>
