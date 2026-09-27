<script lang="ts">
	import Button from '../Button.svelte'
	import Input from '../Input.svelte'
	let {
		title = $bindable(),
		slug = $bindable(),
		saving,
		onCreate,
		onCancel
	}: {
		title: string
		slug: string
		saving: boolean
		onCreate: () => void
		onCancel: () => void
	} = $props()
</script>

<div class="create-new-form">
	<h4>Create New Album</h4>
	<Input label="Album Title" bind:value={title} placeholder="My New Album" fullWidth />
	<Input label="URL Slug" bind:value={slug} placeholder="my-new-album" fullWidth />
	<div class="form-actions">
		<Button variant="ghost" onclick={onCancel} disabled={saving}>Cancel</Button>
		<Button variant="primary" onclick={onCreate} disabled={!title.trim() || !slug.trim() || saving}>
			{saving ? 'Creating...' : 'Create Album'}
		</Button>
	</div>
</div>

<style lang="scss">
	.create-new-form {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;

		h4 {
			margin: 0;
			font-size: 1rem;
			font-weight: 600;
			color: $gray-10;
		}
	}
	.form-actions {
		display: flex;
		gap: $unit-2x;
		justify-content: flex-end;
	}
</style>
