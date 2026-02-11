<script lang="ts">
	import GenericMetadataPopover, { type MetadataConfig } from './GenericMetadataPopover.svelte'

	interface Tag {
		id: number
		name: string
		displayName: string
		slug: string
	}

	interface PostLike {
		id?: number | null
		createdAt: Date | string
		updatedAt: Date | string
		publishedAt: Date | string | null
	}

	type Props = {
		post: PostLike
		postType?: string
		slug: string
		excerpt?: string
		syndicationText?: string
		tags: Tag[]
		heartCount?: number
		triggerElement: HTMLElement
		onDelete: () => void
		onClose?: () => void
		onFieldUpdate?: (key: string, value: unknown) => void
	}

	let {
		post,
		postType,
		slug = $bindable(),
		excerpt = $bindable(''),
		syndicationText = $bindable(''),
		tags = $bindable(),
		heartCount,
		triggerElement,
		onDelete,
		onClose = () => {},
		onFieldUpdate
	}: Props = $props()

	function handleFieldUpdate(key: string, value: unknown) {
		if (key === 'slug' && typeof value === 'string') {
			slug = value
			onFieldUpdate?.(key, value)
		}
		if (key === 'syndicationText' && typeof value === 'string') {
			syndicationText = value
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
				type: 'textarea',
				key: 'syndicationText',
				label: 'Syndication message',
				rows: 3,
				placeholder: 'Custom message for Bluesky/Mastodon...',
				helpText: 'Overrides auto-generated text (max 240 chars)'
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
		syndicationText,
		createdAt: post.createdAt,
		updatedAt: post.updatedAt,
		publishedAt: post.publishedAt,
		heartCount
	})

	// Sync changes back
	$effect(() => {
		popoverData = {
			slug,
			tags,
			syndicationText,
			createdAt: post.createdAt,
			updatedAt: post.updatedAt,
			publishedAt: post.publishedAt,
			heartCount
		}
	})
</script>

<GenericMetadataPopover
	{config}
	bind:data={popoverData}
	{triggerElement}
	onUpdate={handleFieldUpdate}
	{onClose}
/>
