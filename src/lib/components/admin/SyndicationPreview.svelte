<script lang="ts">
	import { api } from '$lib/admin/api'
	import SocialPreviewCard from './SocialPreviewCard.svelte'
	import {
		extractMediaFromContent,
		extractUrlEmbedsFromContent,
		computeSyndicationText
	} from '$lib/utils/syndication'
	import type { JSONContent } from '@tiptap/core'

	let {
		syndicationText,
		postType,
		title,
		excerpt,
		content,
		featuredImage,
		appendLink,
		slug
	}: {
		syndicationText: string
		postType: 'post' | 'essay'
		title: string
		excerpt: string
		content?: JSONContent
		featuredImage: string
		appendLink: boolean
		slug: string
	} = $props()
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
	$effect(() => {
		const url = textUrl
		if (!url || (firstUrlEmbed && firstUrlEmbed.url === url)) return
		const controller = new AbortController()
		api
			.get<OgData>(`/api/og-metadata?url=${encodeURIComponent(url)}`, { signal: controller.signal })
			.then((data) => {
				if (!controller.signal.aborted) ogCache[url] = data
			})
			.catch(() => {
				/* Preview metadata is optional; the text remains available. */
			})
		return () => controller.abort()
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

<SocialPreviewCard
	text={previewText}
	images={previewImages}
	videos={previewVideos}
	{linkUrl}
	{embed}
/>
