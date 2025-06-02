<script lang="ts">
	import GenericMetadataPopover, { type MetadataConfig } from './GenericMetadataPopover.svelte'

	type Props = {
		post: any
		postType: 'post' | 'essay'
		slug: string
		excerpt: string
		tags: string[]
		tagInput: string
		triggerElement: HTMLElement
		onAddTag: () => void
		onRemoveTag: (tag: string) => void
		onDelete: () => void
	}

	let {
		post,
		postType,
		slug = $bindable(),
		excerpt = $bindable(),
		tags = $bindable(),
		tagInput = $bindable(),
		triggerElement,
		onAddTag,
		onRemoveTag,
		onDelete
	}: Props = $props()

	function handleFieldUpdate(key: string, value: any) {
		if (key === 'slug') {
			slug = value
		} else if (key === 'excerpt') {
			excerpt = value
		} else if (key === 'tagInput') {
			tagInput = value
		}
	}

	const config: MetadataConfig = {
		title: 'Post Settings',
		fields: [
			{
				type: 'input',
				key: 'slug',
				label: 'Slug',
				placeholder: 'post-slug'
			},
			...(postType === 'essay' ? [{
				type: 'textarea' as const,
				key: 'excerpt',
				label: 'Excerpt',
				rows: 3,
				placeholder: 'Brief description...'
			}] : []),
			{
				type: 'tags',
				key: 'tags',
				label: 'Tags',
				placeholder: 'Add tags...'
			},
			{
				type: 'metadata',
				key: 'metadata'
			}
		],
		deleteButton: {
			label: 'Delete Post',
			action: onDelete
		}
	}

	// Create a reactive data object
	let popoverData = $state({
		slug,
		excerpt,
		tags,
		tagInput,
		createdAt: post.createdAt,
		updatedAt: post.updatedAt,
		publishedAt: post.publishedAt
	})

	// Sync changes back
	$effect(() => {
		popoverData = {
			slug,
			excerpt,
			tags,
			tagInput,
			createdAt: post.createdAt,
			updatedAt: post.updatedAt,
			publishedAt: post.publishedAt
		}
	})
</script>

<GenericMetadataPopover 
	{config}
	bind:data={popoverData}
	{triggerElement}
	onUpdate={handleFieldUpdate}
	{onAddTag}
	{onRemoveTag}
/>