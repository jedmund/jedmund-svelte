<script lang="ts">
	import Button from './Button.svelte'
	import Modal from './Modal.svelte'
	import Switch from './Switch.svelte'
	import Textarea from './Textarea.svelte'
	import Input from './Input.svelte'
	import SocialPreviewCard from './SocialPreviewCard.svelte'
	import BlueskyIcon from '$icons/bluesky.svg?component'
	import MastodonIcon from '$icons/mastodon.svg?component'
	import {
		extractMediaFromContent,
		extractUrlEmbedsFromContent,
		computeSyndicationText
	} from '$lib/utils/syndication'
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
	interface SyndicationRecord {
		id: number
		platform: string
		status: string
		externalUrl: string | null
		errorMessage: string | null
		createdAt: string
	}

	let syndications = $state<SyndicationRecord[]>([])
	let _syndicationLoading = $state(false)
	let triggering = $state(false)
	let linkModalOpen = $state(false)
	let linkModalPlatform = $state<string | null>(null)
	let linkModalUrl = $state('')
	let linkModalRecord = $state<SyndicationRecord | null>(null)

	const blueskyRecord = $derived(syndications.find((s) => s.platform === 'bluesky'))
	const mastodonRecord = $derived(syndications.find((s) => s.platform === 'mastodon'))
	const isPublished = $derived(contentStatus === 'published')

	$effect(() => {
		if (isPublished && contentId) {
			fetchStatus()
		}
	})

	async function fetchStatus() {
		_syndicationLoading = true
		try {
			const res = await fetch(`/api/syndication/status?contentType=post&contentId=${contentId}`)
			if (res.ok) {
				const data = await res.json()
				syndications = data.syndications
			}
		} catch {
			// Silently fail
		} finally {
			_syndicationLoading = false
		}
	}

	async function triggerSyndication() {
		triggering = true
		try {
			const res = await fetch('/api/syndication/trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contentType: 'post', contentId })
			})
			if (res.ok) {
				const data = await res.json()
				syndications = data.syndications
			}
		} catch {
			// Silently fail
		} finally {
			triggering = false
		}
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
		if (!linkModalUrl.trim() || !linkModalPlatform) return

		try {
			if (linkModalRecord) {
				// Edit existing
				const res = await fetch(`/api/syndication/${linkModalRecord.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ externalUrl: linkModalUrl })
				})
				if (res.ok) {
					const updated = await res.json()
					syndications = syndications.map((s) => (s.id === updated.id ? updated : s))
				}
			} else {
				// Add new
				const res = await fetch('/api/syndication/status', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						contentType: 'post',
						contentId,
						platform: linkModalPlatform,
						externalUrl: linkModalUrl
					})
				})
				if (res.ok) {
					const record = await res.json()
					syndications = [...syndications, record]
				}
			}
		} catch {
			// Silently fail
		} finally {
			closeLinkModal()
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

	let contentMedia = $derived.by(() => extractMediaFromContent(content))
	let urlEmbeds = $derived.by(() => extractUrlEmbedsFromContent(content))
	let firstUrlEmbed = $derived(urlEmbeds[0])

	let previewImages = $derived.by(() => {
		const all: { url: string; alt: string }[] = []
		if (featuredImage) {
			all.push({ url: featuredImage, alt: title || '' })
		}
		for (const img of contentMedia.images) {
			if (all.length >= 4) break
			if (!all.some((i) => i.url === img.url)) {
				all.push(img)
			}
		}
		return all
	})

	let previewVideos = $derived(contentMedia.videos)

	let previewText = $derived.by(() =>
		computeSyndicationText({
			syndicationText,
			postType,
			title,
			excerpt,
			content
		})
	)

	let autoText = $derived.by(() =>
		computeSyndicationText({
			postType,
			title,
			excerpt,
			content
		})
	)

	let hasMedia = $derived(previewImages.length > 0 || previewVideos.length > 0)
	let linkUrl = $derived.by(() => {
		if (appendLink && slug) return `https://jedmund.com/universe/${slug}`
		if (!appendLink && firstUrlEmbed) return firstUrlEmbed.url
		return undefined
	})

	// Embed card for our own link (no media + appendLink on)
	// Image fallback mirrors public page og:image: featuredImage → content image → site default
	const OG_DEFAULT_IMAGE = '/images/og-image.jpg'

	let ownEmbed = $derived.by(() => {
		if (hasMedia || !appendLink || !slug) return undefined
		const image =
			featuredImage || urlEmbeds[0]?.image || contentMedia.images[0]?.url || OG_DEFAULT_IMAGE
		return {
			url: `https://jedmund.com/universe/${slug}`,
			title: title || undefined,
			description: excerpt || undefined,
			image,
			domain: 'jedmund.com'
		}
	})

	// External embed: use urlEmbed node data directly, or fall back to OG fetch for text URLs
	let textUrl = $derived.by(() => {
		if (hasMedia || appendLink) return undefined
		// First check urlEmbed nodes in content
		if (firstUrlEmbed) return firstUrlEmbed.url
		// Fall back to regex on preview text
		const match = previewText.match(/https?:\/\/[^\s]+/)
		return match ? match[0] : undefined
	})

	// OG fetch only needed when we have a text URL but no urlEmbed data for it
	interface OgData {
		url: string
		title?: string
		description?: string
		image?: string
		siteName?: string
	}

	let ogCache = $state<Record<string, OgData>>({})
	let ogLoading = $state<Record<string, boolean>>({})

	$effect(() => {
		const url = textUrl
		if (!url || ogCache[url] || ogLoading[url]) return
		// Skip fetch if we already have urlEmbed data for this URL
		if (firstUrlEmbed && firstUrlEmbed.url === url) return

		ogLoading[url] = true
		fetch(`/api/og-metadata?url=${encodeURIComponent(url)}`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data: OgData | null) => {
				if (data) {
					ogCache[url] = data
				}
			})
			.catch(() => {})
			.finally(() => {
				ogLoading[url] = false
			})
	})

	let externalEmbed = $derived.by(() => {
		if (!textUrl) return undefined

		// Use urlEmbed node data directly if available
		if (firstUrlEmbed && firstUrlEmbed.url === textUrl) {
			let domain = ''
			try {
				domain = new URL(textUrl).hostname.replace('www.', '')
			} catch {
				// ignore
			}
			return {
				url: textUrl,
				title: firstUrlEmbed.title || undefined,
				description: firstUrlEmbed.description || undefined,
				image: firstUrlEmbed.image || undefined,
				domain: firstUrlEmbed.siteName || domain
			}
		}

		// Fall back to fetched OG data
		const og = ogCache[textUrl]
		if (!og) return undefined
		let domain = ''
		try {
			domain = new URL(textUrl).hostname.replace('www.', '')
		} catch {
			// ignore
		}
		return {
			url: textUrl,
			title: og.title || undefined,
			description: og.description || undefined,
			image: og.image || undefined,
			domain: og.siteName || domain
		}
	})

	let embed = $derived(ownEmbed || externalEmbed)
</script>

{#snippet platformRow(
	platform: string,
	record: SyndicationRecord | undefined,
	checked: boolean,
	onchange: (v: boolean) => void
)}
	<div class="platform-row">
		<div class="toggle-row">
			<span class="toggle-label">
				<span class="platform-icon {platform}">
					{#if platform === 'bluesky'}<BlueskyIcon />{:else}<MastodonIcon />{/if}
				</span>
				{platform === 'bluesky' ? 'Bluesky' : 'Mastodon'}
			</span>
			<div class="platform-controls">
				{#if isPublished && record}
					{#if (record.status === 'success' || record.status === 'manual') && record.externalUrl}
						<div class="action-links">
							<a
								href={record.externalUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="view-link">View</a
							>
							<button
								type="button"
								class="edit-link"
								onclick={() => openLinkModal(platform, record)}>Edit</button
							>
						</div>
					{:else if record.status === 'failed'}
						<span class="error-text" title={record.errorMessage || ''}>Failed</span>
					{/if}
				{:else if isPublished && !record}
					<button type="button" class="add-link" onclick={() => openLinkModal(platform)}
						>Add link</button
					>
				{/if}
				<Switch {checked} {onchange} />
			</div>
		</div>
	</div>
{/snippet}

<div class="form-section">
	<div class="preview-section">
		<SocialPreviewCard
			text={previewText}
			images={previewImages}
			videos={previewVideos}
			{linkUrl}
			{embed}
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
					disabled={triggering || allSyndicated}
				>
					{triggering ? 'Posting...' : 'Post'}
				</Button>
			{/if}
		</div>
		{@render platformRow('bluesky', blueskyRecord, syndicateBluesky, (v) => (syndicateBluesky = v))}
		{@render platformRow(
			'mastodon',
			mastodonRecord,
			syndicateMastodon,
			(v) => (syndicateMastodon = v)
		)}
	</div>
</div>

<Modal bind:isOpen={linkModalOpen} size="medium" onClose={closeLinkModal}>
	<div class="link-modal">
		<h3 class="link-modal-title">
			{linkModalRecord ? 'Edit' : 'Add'}
			{linkModalPlatform === 'bluesky' ? 'Bluesky' : 'Mastodon'} link
		</h3>
		<Input bind:value={linkModalUrl} placeholder="https://..." />
		<div class="link-modal-actions">
			<Button variant="secondary" onclick={closeLinkModal}>Cancel</Button>
			<Button variant="primary" onclick={saveLinkModal} disabled={!linkModalUrl.trim()}>Save</Button
			>
		</div>
	</div>
</Modal>

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

	.platform-icon {
		display: flex;
		flex-shrink: 0;

		:global(svg) {
			width: 16px;
			height: 16px;
		}

		&.bluesky {
			color: #1185fe;
		}

		&.mastodon {
			color: #6364ff;
		}
	}

	.platform-controls {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}

	.action-links {
		display: flex;
		gap: $unit;
	}

	.view-link {
		font-size: $font-size-small;
		color: $blue-50;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.edit-link,
	.add-link {
		font-size: $font-size-small;
		color: $gray-50;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;

		&:hover {
			color: $gray-30;
		}
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

	.error-text {
		font-size: $font-size-small;
		color: $red-50;
		cursor: help;
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

	.link-modal {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		padding: $unit-4x;
	}

	.link-modal-title {
		margin: 0;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-20;
	}

	.link-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: $unit-2x;
	}

	.preview-section {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
	}
</style>
