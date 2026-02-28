<script lang="ts">
	import Input from './Input.svelte'
	import Textarea from './Textarea.svelte'
	import TagInput from './TagInput.svelte'
	import ImagePicker from './ImagePicker.svelte'
	import type { Media } from '@prisma/client'

	interface Tag {
		id: number
		name: string
		displayName: string
		slug: string
	}

	interface PostMetadataFormProps {
		postType: 'post' | 'essay'
		slug: string
		excerpt?: string
		featuredImage?: string
		tags: Tag[]
		heartCount?: number
		createdAt: string | Date
		updatedAt: string | Date
		publishedAt: string | Date | null
	}

	let {
		postType,
		slug = $bindable(),
		excerpt = $bindable(''),
		featuredImage = $bindable(''),
		tags = $bindable([]),
		heartCount,
		createdAt,
		updatedAt,
		publishedAt
	}: PostMetadataFormProps = $props()

	// Featured image media state for ImagePicker
	let featuredImageMedia = $state<Media | null>(null)

	function createMediaFromUrl(url: string): Media {
		return {
			id: -1,
			filename: url.split('/').pop() || 'image',
			originalName: url.split('/').pop() || 'image',
			mimeType: 'image/jpeg',
			size: 0,
			url,
			thumbnailUrl: url,
			width: null,
			height: null,
			description: null,
			usedIn: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			isPhotography: false,
			exifData: null,
			photoCaption: null,
			photoTitle: null,
			photoDescription: null,
			photoSlug: null,
			photoPublishedAt: null,
			dominantColor: null,
			colors: null,
			aspectRatio: null,
			duration: null,
			videoCodec: null,
			audioCodec: null,
			bitrate: null
		} as Media
	}

	// Initialize featuredImageMedia from URL
	$effect(() => {
		if (featuredImage && !featuredImageMedia) {
			featuredImageMedia = createMediaFromUrl(featuredImage)
		}
		if (!featuredImage && featuredImageMedia) {
			featuredImageMedia = null
		}
	})

	// Sync media selection back to URL string
	$effect(() => {
		const url = featuredImageMedia?.url || ''
		if (url !== featuredImage) {
			featuredImage = url
		}
	})

	function formatDate(date: string | Date | null) {
		if (!date) return 'Never'
		try {
			return new Date(date).toLocaleString()
		} catch {
			return 'Unknown'
		}
	}
</script>

<div class="form-section">
	<Input
		label="Slug"
		size="jumbo"
		bind:value={slug}
		placeholder="post-slug"
		helpText="URL-friendly identifier for this post"
	/>

	{#if postType === 'essay'}
		<Textarea
			label="Excerpt"
			size="jumbo"
			bind:value={excerpt}
			rows={3}
			placeholder="Short excerpt or summary..."
			helpText="Optional summary shown on listing pages"
		/>
	{/if}

	<TagInput label="Tags" size="jumbo" bind:tags placeholder="Add tags..." />

	<ImagePicker
		label="Featured Image"
		bind:value={featuredImageMedia}
		placeholder="Select an image for social sharing (og:image)"
		aspectRatio="2:1"
	/>

	<div class="metadata-section">
		<h3 class="metadata-title">Post Information</h3>
		<div class="metadata-grid">
			<div class="metadata-item">
				<span class="metadata-label">Created</span>
				<span class="metadata-value">{formatDate(createdAt)}</span>
			</div>
			<div class="metadata-item">
				<span class="metadata-label">Last Updated</span>
				<span class="metadata-value">{formatDate(updatedAt)}</span>
			</div>
			<div class="metadata-item">
				<span class="metadata-label">Published</span>
				<span class="metadata-value">{formatDate(publishedAt)}</span>
			</div>
			{#if heartCount != null}
				<div class="metadata-item">
					<span class="metadata-label">Hearts</span>
					<span class="metadata-value">{heartCount}</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-6x;
	}

	.metadata-section {
		padding: $unit-4x;
		background: $gray-97;
		border-radius: $corner-radius;
		border: 1px solid $gray-90;
	}

	.metadata-title {
		margin: 0 0 $unit-2x 0;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-20;
	}

	.metadata-grid {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.metadata-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.metadata-label {
		font-size: $font-size-small;
		color: $gray-50;
	}

	.metadata-value {
		font-size: $font-size-small;
		color: $gray-30;
		font-weight: 500;
	}
</style>
