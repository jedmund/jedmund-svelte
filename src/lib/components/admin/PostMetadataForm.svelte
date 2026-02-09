<script lang="ts">
	import Input from './Input.svelte'
	import Textarea from './Textarea.svelte'
	import TagInput from './TagInput.svelte'
	import SyndicationStatus from './SyndicationStatus.svelte'

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
		tags: Tag[]
		heartCount?: number
		createdAt: string | Date
		updatedAt: string | Date
		publishedAt: string | Date | null
		contentId?: number
		contentStatus?: string
	}

	let {
		postType,
		slug = $bindable(),
		excerpt = $bindable(''),
		tags = $bindable([]),
		heartCount,
		createdAt,
		updatedAt,
		publishedAt,
		contentId,
		contentStatus
	}: PostMetadataFormProps = $props()

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

	{#if contentId && contentStatus}
		<SyndicationStatus contentType="post" {contentId} {contentStatus} />
	{/if}

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
