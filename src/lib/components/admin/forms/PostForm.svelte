<script lang="ts">
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import FormPageHeader from '$lib/components/admin/forms/FormPageHeader.svelte'
	import Composer from '$lib/components/admin/composer/ComposerCore.svelte'
	import PostMetadataForm from '$lib/components/admin/PostMetadataForm.svelte'
	import PostSyndicationForm from '$lib/components/admin/PostSyndicationForm.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import UnsavedChangesModal from '$lib/components/admin/UnsavedChangesModal.svelte'
	import StatusDropdown from '$lib/components/admin/StatusDropdown.svelte'
	import ErrorMessage from '$lib/components/admin/ErrorMessage.svelte'
	import type { JSONContent } from '@tiptap/core'
	import type { ApiPost } from './post-types'
	import { untrack } from 'svelte'
	import { createPostForm } from '$lib/components/admin/forms/createPostForm.svelte'
	interface Props {
		initialPost?: ApiPost | null
		initialPostType?: 'post' | 'essay'
		initialContent?: JSONContent | null
	}

	let { initialPost = null, initialPostType = 'post', initialContent = null }: Props = $props()
	const form = untrack(() => createPostForm({ initialPost, initialPostType, initialContent }))
</script>

<svelte:head>
	<title
		>{form.title ? `${form.title} - Admin @jedmund` : form.id === null ? 'New Post' : 'Edit Post'} -
		Admin @jedmund</title
	>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<FormPageHeader
			title={form.config.label}
			tabs={form.tabOptions}
			bind:activeTab={form.activeTab}
		>
			{#snippet actions()}
				<StatusDropdown
					status={form.status}
					onSave={(target) => {
						// If the user is publishing a dirty draft, flush any pending auto-save first so we publish on top of the latest saved form.snapshot.
						if (form.status === 'draft' && target !== 'draft' && form.isDirty) {
							form.autoSave
								.flush()
								.then(() => form.handleSave(target))
								.catch(() => {})
						} else {
							form.handleSave(target).catch(() => {})
						}
					}}
					disabled={form.saving}
					isLoading={form.saving}
					triggerText={form.status === 'draft' ? form.autoSaveLabel : undefined}
					viewUrl={form.status === 'published' && form.slug ? `/universe/${form.slug}` : undefined}
					onDelete={form.id !== null ? form.openDeleteConfirmation : undefined}
					onCopyPreviewLink={form.id !== null && form.slug ? form.handleCopyPreviewLink : undefined}
				/>
			{/snippet}
		</FormPageHeader>
	{/snippet}

	<div class="admin-container">
		{#if form.saveError}
			<ErrorMessage message={form.saveError} dismissible onDismiss={() => (form.saveError = '')} />
		{/if}
		<div class="tab-panels">
			<div class="panel panel-content" class:active={form.activeTab === 'content'}>
				<div class="main-content">
					{#if form.config?.showTitle}
						<input type="text" bind:value={form.title} placeholder="Title" class="title-input" />
					{/if}

					{#if form.config?.showContent}
						<div class="editor-wrapper">
							<Composer
								bind:data={form.content}
								placeholder={form.id === null ? 'Start writing...' : 'Continue writing...'}
							/>
						</div>
					{/if}
				</div>
			</div>

			<div class="panel content-wrapper" class:active={form.activeTab === 'metadata'}>
				<PostMetadataForm
					postType={form.postType}
					bind:slug={form.slug}
					bind:excerpt={form.excerpt}
					bind:featuredImage={form.featuredImage}
					bind:tags={form.tags}
					bind:publishedAt={form.publishedAt}
					heartCount={form.heartCount}
					createdAt={initialPost?.createdAt ?? new Date().toISOString()}
					updatedAt={initialPost?.updatedAt ?? new Date().toISOString()}
					onSlugEdit={() => (form.slugManuallySet = true)}
				/>
			</div>

			{#if form.id !== null}
				<div class="panel content-wrapper" class:active={form.activeTab === 'syndication'}>
					<PostSyndicationForm
						postType={form.postType}
						slug={form.slug}
						title={form.title}
						excerpt={form.excerpt}
						content={form.content}
						featuredImage={form.featuredImage}
						bind:syndicationText={form.syndicationText}
						bind:syndicateBluesky={form.syndicateBluesky}
						bind:syndicateMastodon={form.syndicateMastodon}
						bind:appendLink={form.appendLink}
						contentId={form.id}
						contentStatus={form.status}
					/>
				</div>
			{/if}
		</div>
	</div>
</AdminPage>

<DeleteConfirmationModal
	bind:isOpen={form.showDeleteConfirmation}
	title="Delete Post?"
	message="Are you sure you want to delete this post? This action cannot be undone."
	confirmText="Delete Post"
	onConfirm={form.handleDelete}
	onCancel={() => (form.showDeleteConfirmation = false)}
/>

<UnsavedChangesModal
	isOpen={form.lifecycle.showUnsavedChangesModal}
	onContinueEditing={form.lifecycle.handleContinueEditing}
	onLeave={form.lifecycle.handleLeaveWithoutSaving}
/>

<style lang="scss">
	.admin-container {
		width: 100%;
		margin: 0 auto;
		padding: 0 $unit-2x $unit-4x;
		box-sizing: border-box;

		@include breakpoint('phone') {
			padding: 0 $unit-2x $unit-2x;
		}
	}

	.tab-panels {
		position: relative;

		.panel {
			display: none;
			box-sizing: border-box;

			&.active {
				display: block;
			}
		}
	}

	.content-wrapper {
		background: white;
		border-radius: $unit-2x;
		padding: 0;
		width: 100%;
		margin: 0 auto;
	}

	.panel-content {
		background: transparent;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		min-width: 0;
	}

	.title-input {
		width: 100%;
		max-width: clamp(600px, 70%, 840px);
		margin-inline: auto;
		padding: 0;
		border: none;
		font-size: 2.5rem;
		font-weight: 700;
		color: $gray-10;
		background: none;

		&:focus {
			outline: none;
		}

		&::placeholder {
			color: $gray-60;
		}
	}

	.editor-wrapper {
		width: 100%;
		min-height: 400px;
		padding: 0;
	}
</style>
