<script lang="ts">
	import Input from '../Input.svelte'
	import Textarea from '../Textarea.svelte'
	let {
		essayTitle = $bindable(''),
		essaySlug = $bindable(''),
		essayExcerpt = $bindable(''),
		essayTags = $bindable('')
	} = $props<{
		essayTitle?: string
		essaySlug?: string
		essayExcerpt?: string
		essayTags?: string
	}>()
</script>

<div class="metadata-section">
	<Input label="Title" bind:value={essayTitle} placeholder="Essay title" required />

	<Input label="Slug" bind:value={essaySlug} placeholder="essay-slug" />

	<Textarea
		label="Excerpt"
		bind:value={essayExcerpt}
		placeholder="Brief description of your essay"
		rows={3}
	/>

	<Input
		label="Tags"
		bind:value={essayTags}
		placeholder="design, development, thoughts"
		helpText="Comma-separated list of tags"
	/>
</div>

<style lang="scss">
	.metadata-section {
		max-width: 600px;
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
	}
</style>
