<script lang="ts">
	import GenericMetadataPopover, { type MetadataConfig } from './GenericMetadataPopover.svelte'

	type Props = {
		post: any
		postType: 'post' | 'essay'
		slug: string
		tags: string[]
		tagInput: string
		triggerElement: HTMLElement
		onAddTag: () => void
		onRemoveTag: (tag: string) => void
		onDelete: () => void
		onClose?: () => void
		onFieldUpdate?: (key: string, value: any) => void
	}

	let {
		post,
		postType,
		slug = $bindable(),
		tags = $bindable(),
		tagInput = $bindable(),
		triggerElement,
		onAddTag,
		onRemoveTag,
		onDelete,
		onClose = () => {},
		onFieldUpdate
	}: Props = $props()

	function handleFieldUpdate(key: string, value: any) {
		if (key === 'slug') {
			slug = value
			onFieldUpdate?.(key, value)
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
	{onClose}
/>
