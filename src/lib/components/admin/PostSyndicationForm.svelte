<script lang="ts">
	import { onDestroy } from 'svelte'
	import { syndicationRequests, type SyndicationRecord } from '$lib/admin/syndication/requests'
	import { createSyndicationSession, type SyndicationState } from '$lib/admin/syndication/session'
	let remote = $state<SyndicationState>({
		records: [],
		loading: false,
		triggering: false,
		saving: false,
		error: ''
	})
	const session = createSyndicationSession(syndicationRequests, (state) => {
		remote = state
	})
	onDestroy(() => session.dispose())
	import Button from './Button.svelte'
	import SyndicationLinkModal from './SyndicationLinkModal.svelte'
	import Switch from './Switch.svelte'
	import Textarea from './Textarea.svelte'
	import SyndicationPreview from './SyndicationPreview.svelte'
	import SyndicationPlatform from './SyndicationPlatform.svelte'
	import { computeSyndicationText } from '$lib/utils/syndication'
	import type { JSONContent } from '@tiptap/core'

	interface Props {
		syndicateBluesky: boolean
		syndicateMastodon: boolean
		syndicationText: string
		appendLink: boolean
		postType: 'post' | 'essay'
		slug?: string
		title?: string
		excerpt?: string
		content?: JSONContent
		featuredImage?: string
		contentId?: number
		contentStatus?: string
	}

	let {
		syndicateBluesky = $bindable(),
		syndicateMastodon = $bindable(),
		syndicationText = $bindable(),
		appendLink = $bindable(),
		postType,
		slug = '',
		title = '',
		excerpt = '',
		content,
		featuredImage = '',
		contentId,
		contentStatus
	}: Props = $props()

	// --- Syndication status ---

	let linkModalOpen = $state(false)
	let linkModalPlatform = $state<string | null>(null)
	let linkModalUrl = $state('')
	let linkModalRecord = $state<SyndicationRecord | null>(null)

	const blueskyRecord = $derived(remote.records.find((s) => s.platform === 'bluesky'))
	const mastodonRecord = $derived(remote.records.find((s) => s.platform === 'mastodon'))
	const isPublished = $derived(contentStatus === 'published')

	$effect(() => {
		session.setTarget(isPublished && contentId ? { contentType: 'post', contentId } : undefined)
		return () => session.dispose()
	})

	async function triggerSyndication() {
		await session.trigger()
	}

	function openLinkModal(platform: string, record?: SyndicationRecord) {
		linkModalPlatform = platform
		linkModalRecord = record ?? null
		linkModalUrl = record?.externalUrl || ''
		linkModalOpen = true
	}

	function closeLinkModal() {
		linkModalOpen = false
		linkModalPlatform = null
		linkModalRecord = null
		linkModalUrl = ''
	}

	async function saveLinkModal() {
		const platform = linkModalPlatform
		const url = linkModalUrl
		if (!platform) return
		if (await session.save(platform, url, linkModalRecord?.id)) {
			if (linkModalPlatform === platform && linkModalUrl === url) closeLinkModal()
		}
	}

	// Disabled when all enabled platforms already have successful links
	const blueskyDone = $derived(
		!syndicateBluesky || blueskyRecord?.status === 'success' || blueskyRecord?.status === 'manual'
	)
	const mastodonDone = $derived(
		!syndicateMastodon ||
			mastodonRecord?.status === 'success' ||
			mastodonRecord?.status === 'manual'
	)
	const allSyndicated = $derived(blueskyDone && mastodonDone)

	let autoText = $derived.by(() =>
		computeSyndicationText({
			postType,
			title,
			excerpt,
			content
		})
	)
</script>

<div class="form-section">
	{#if remote.error}<p role="alert">{remote.error}</p>{/if}
	<div class="preview-section">
		<SyndicationPreview
			{syndicationText}
			{postType}
			{title}
			{excerpt}
			{content}
			{featuredImage}
			{appendLink}
			{slug}
		/>
	</div>

	<div class="syndication-toggles">
		<h3 class="section-title">Message</h3>
		<div class="toggle-group">
			<div class="toggle-row">
				<span class="toggle-label">Append link to post</span>
				<Switch bind:checked={appendLink} />
			</div>
			<span class="help-text">Adds a link back to your site at the end of the post.</span>
		</div>
		<Textarea
			size="jumbo"
			bind:value={syndicationText}
			rows={3}
			maxLength={240}
			showCharCount={true}
			placeholder={autoText || 'Custom message for Bluesky/Mastodon...'}
			helpText="Overrides auto-generated text shown above."
		/>
	</div>

	<div class="syndication-toggles">
		<div class="section-header">
			<h3 class="section-title">Cross-posting</h3>
			{#if isPublished}
				<Button
					variant="danger-text"
					buttonSize="large"
					pill={false}
					class="post-button"
					onclick={triggerSyndication}
					disabled={remote.triggering || allSyndicated}
				>
					{remote.triggering ? 'Posting...' : 'Post'}
				</Button>
			{/if}
		</div>
		<SyndicationPlatform
			platform="bluesky"
			record={blueskyRecord}
			checked={syndicateBluesky}
			onchange={(v) => (syndicateBluesky = v)}
			{isPublished}
			onedit={openLinkModal}
		/>
		<SyndicationPlatform
			platform="mastodon"
			record={mastodonRecord}
			checked={syndicateMastodon}
			onchange={(v) => (syndicateMastodon = v)}
			{isPublished}
			onedit={openLinkModal}
		/>
	</div>
</div>

<SyndicationLinkModal
	bind:isOpen={linkModalOpen}
	bind:url={linkModalUrl}
	platform={linkModalPlatform}
	record={linkModalRecord}
	saving={remote.saving}
	onsave={saveLinkModal}
	onclose={closeLinkModal}
/>

<style lang="scss">
	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-6x;
	}

	.syndication-toggles {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.toggle-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-20;
	}

	.toggle-group {
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}

	.help-text {
		font-size: $font-size-small;
		color: $gray-40;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-title {
		margin: 0;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-20;
	}

	:global(.post-button.btn) {
		min-height: unset;
	}

	.preview-section {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
	}
</style>
