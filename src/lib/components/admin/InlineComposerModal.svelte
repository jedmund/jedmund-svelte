<script lang="ts">
	import { goto } from '$app/navigation'
	import Modal from './Modal.svelte'
	import Composer from './composer/ComposerCore.svelte'
	import { onDestroy } from 'svelte'
	import { createComposerSubmission } from '$lib/admin/composer-submission'
	import { publishComposerPost } from '$lib/admin/composer-requests'
	import Button from './Button.svelte'
	import ComposerAttachments from './composer/ComposerAttachments.svelte'
	import ComposerActions from './composer/ComposerActions.svelte'
	import EssayComposerLayout from './composer/EssayComposerLayout.svelte'
	import type { JSONContent } from '@tiptap/core'
	import type { Media } from '@prisma/client'

	interface Props {
		isOpen?: boolean
		initialMode?: 'modal' | 'page'
		initialPostType?: 'post' | 'essay'
		initialContent?: JSONContent
		closeOnSave?: boolean
		onclose?: (event: CustomEvent) => void
		onsaved?: (event: CustomEvent) => void
	}

	let {
		isOpen = $bindable(false),
		initialMode = 'modal',
		initialPostType = 'post',
		initialContent = undefined,
		closeOnSave = true,
		onclose,
		onsaved
	}: Props = $props()

	type PostType = 'post' | 'essay'
	type ComposerMode = 'modal' | 'page'

	let postType: PostType = $state(initialPostType)
	let mode: ComposerMode = $state(initialMode)
	let content: JSONContent = $state(
		initialContent || {
			type: 'doc',
			content: [{ type: 'paragraph' }]
		}
	)
	let characterCount = $state(0)
	let editorInstance: Composer | undefined = $state.raw()

	// Essay metadata
	let essayTitle = $state('')
	let essaySlug = $state('')
	let essayExcerpt = $state('')
	let essayTags = $state('')

	// Photo attachment state
	let attachedPhotos: Media[] = $state([])
	let attachmentManager: ComposerAttachments | undefined = $state.raw()

	const CHARACTER_LIMIT = 600
	const submission = createComposerSubmission(publishComposerPost)
	let saving = $state(false)
	let saveError = $state('')
	onDestroy(() => {
		submission.cancel()
	})
	function draft() {
		return {
			postType,
			content,
			photoIds: attachedPhotos.map((photo) => photo.id),
			title: essayTitle,
			slug: essaySlug,
			excerpt: essayExcerpt,
			tags: essayTags
		}
	}

	function handleClose() {
		if (hasContent() && !confirm('Are you sure you want to close? Your changes will be lost.')) {
			return
		}
		resetComposer()
		isOpen = false
		onclose?.(new CustomEvent('close'))
	}

	function hasContent(): boolean {
		return characterCount > 0 || attachedPhotos.length > 0
	}

	function resetComposer() {
		submission.cancel()
		attachmentManager?.reset()
		essayTitle = ''
		essaySlug = ''
		essayExcerpt = ''
		essayTags = ''
		postType = initialPostType
		content = {
			type: 'doc',
			content: [{ type: 'paragraph' }]
		}
		characterCount = 0
		attachedPhotos = []
		if (editorInstance) {
			editorInstance.clear()
		}
	}

	function switchToEssay() {
		// Store content in sessionStorage to avoid messy URLs
		if (content && content.content && content.content.length > 0) {
			sessionStorage.setItem('draft_content', JSON.stringify(content))
		}
		goto('/admin/posts/new?type=essay').catch((error) => {
			saveError = String(error)
		})
	}

	function generateSlug(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
	}

	$effect(() => {
		if (essayTitle && !essaySlug) {
			essaySlug = generateSlug(essayTitle)
		}
	})

	async function handleSave() {
		if (!canSave || saving) return
		saving = true
		saveError = ''
		try {
			const result = await submission.save(draft(), draft)
			if (!result) return
			if (result.unchanged) {
				resetComposer()
				if (closeOnSave) isOpen = false
			}
			onsaved?.(new CustomEvent('saved'))
			if (result.postType === 'essay' && result.unchanged) await goto('/admin/posts')
		} catch (error) {
			saveError = error instanceof Error ? error.message : 'Failed to save post'
		} finally {
			saving = false
		}
	}

	const isOverLimit = $derived(characterCount > CHARACTER_LIMIT)
	const canSave = $derived(
		(postType === 'post' && (characterCount > 0 || attachedPhotos.length > 0) && !isOverLimit) ||
			(postType === 'essay' && essayTitle.length > 0 && Boolean(content))
	)
</script>

{#if saveError}<p role="alert">{saveError}</p>{/if}

{#if mode === 'modal'}
	<Modal bind:isOpen size="medium" onClose={handleClose} showCloseButton={false}>
		<div class="composer">
			<div class="composer-header">
				<Button variant="ghost" onclick={handleClose}>Cancel</Button>
				<div class="header-right">
					<Button
						variant="ghost"
						iconOnly
						onclick={switchToEssay}
						title="Expand to essay"
						class="expand-button"
					>
						{#snippet icon()}<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
								<path
									d="M10 6L14 2M14 2H10M14 2V6"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<path
									d="M6 10L2 14M2 14H6M2 14V10"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>{/snippet}
					</Button>
					<Button variant="primary" onclick={handleSave} disabled={!canSave || saving}>Post</Button>
				</div>
			</div>

			<div class="composer-body">
				<Composer
					bind:this={editorInstance}
					bind:data={content}
					onChange={(newContent) => {
						content = newContent
					}}
					onCharacterCount={(count) => {
						characterCount = count
					}}
					placeholder="What's on your mind?"
					minHeight={80}
					autofocus={true}
					variant="inline"
				/>

				<ComposerAttachments bind:this={attachmentManager} bind:photos={attachedPhotos} />

				<ComposerActions
					{characterCount}
					canSave={canSave && !saving}
					onupload={() => attachmentManager?.upload()}
					onbrowse={() => attachmentManager?.browse()}
					onsave={handleSave}
				/>
			</div>
		</div>
	</Modal>
{:else if mode === 'page'}
	{#if postType === 'essay'}
		<EssayComposerLayout
			bind:essayTitle
			bind:essaySlug
			bind:essayExcerpt
			bind:essayTags
			{canSave}
			{saving}
			onsave={handleSave}
			oncancel={() =>
				goto('/admin/posts').catch((error) => {
					saveError = String(error)
				})}
		>
			{#snippet editor()}
				<Composer
					bind:this={editorInstance}
					bind:data={content}
					onChange={(newContent) => {
						content = newContent
					}}
					onCharacterCount={(count) => {
						characterCount = count
					}}
					placeholder="Start writing your essay..."
					minHeight={500}
					autofocus={true}
					variant="full"
				/>
			{/snippet}
		</EssayComposerLayout>
	{:else}
		<div class="inline-composer">
			{#if hasContent()}
				<Button
					variant="ghost"
					iconOnly
					buttonSize="icon"
					onclick={switchToEssay}
					title="Switch to essay mode"
					class="floating-expand-button"
				>
					{#snippet icon()}<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path
								d="M10 6L14 2M14 2H10M14 2V6"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path
								d="M6 10L2 14M2 14H6M2 14V10"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>{/snippet}
				</Button>
			{/if}
			<div class="composer-body">
				<Composer
					bind:this={editorInstance}
					bind:data={content}
					onChange={(newContent) => {
						content = newContent
					}}
					onCharacterCount={(count) => {
						characterCount = count
					}}
					placeholder="What's on your mind?"
					minHeight={80}
					autofocus={true}
					variant="inline"
				/>

				<ComposerAttachments bind:this={attachmentManager} bind:photos={attachedPhotos} />

				<ComposerActions
					inline
					{characterCount}
					canSave={canSave && !saving}
					onupload={() => attachmentManager?.upload()}
					onbrowse={() => attachmentManager?.browse()}
					onsave={handleSave}
				/>
			</div>
		</div>
	{/if}
{/if}

<style lang="scss">
	.composer {
		padding: 0;
		max-width: 600px;
		margin: 0 auto;
	}

	.composer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit-2x;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: $unit;
	}

	.composer-body {
		display: flex;
		flex-direction: column;
	}

	// Inline composer styles
	.inline-composer {
		position: relative;
		background: white;
		border-radius: $unit-2x;
		border: 1px solid $gray-85;
		box-shadow: 0 0 $unit-2x rgba(0, 0, 0, 0.06);
		overflow: hidden;
		width: 100%;
		transition:
			border-color $transition-normal ease,
			box-shadow $transition-normal ease;

		&:hover,
		&:focus-within {
			border-color: $gray-70;
			box-shadow: 0 0 $unit-2x rgba(0, 0, 0, 0.12);
		}

		.composer-body {
			display: flex;
			flex-direction: column;
		}
	}

	:global(.floating-expand-button) {
		position: absolute !important;
		top: $unit-2x;
		right: $unit-2x;
		z-index: $z-index-dropdown;
		background-color: rgba(255, 255, 255, 0.9) !important;
		backdrop-filter: blur(8px);
		border: 1px solid $gray-80 !important;

		&:hover {
			background-color: rgba(255, 255, 255, 0.95) !important;
		}
	}
</style>
