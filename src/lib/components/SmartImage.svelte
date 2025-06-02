<script lang="ts">
	import type { Media } from '@prisma/client'
	import { browser } from '$app/environment'

	interface Props {
		media: Media
		alt?: string
		class?: string
		containerWidth?: number // If known, use this for smart sizing
		loading?: 'lazy' | 'eager'
		aspectRatio?: string
		sizes?: string // For responsive images
	}

	let {
		media,
		alt = media.altText || media.filename || '',
		class: className = '',
		containerWidth,
		loading = 'lazy',
		aspectRatio,
		sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px'
	}: Props = $props()

	let imgElement: HTMLImageElement
	let actualContainerWidth = $state<number | undefined>(containerWidth)
	let imageUrl = $state('')
	let srcSet = $state('')

	// Update image URL when container width changes
	$effect(() => {
		imageUrl = getImageUrl()
		srcSet = getSrcSet()
	})

	// Detect container width if not provided
	$effect(() => {
		if (browser && !containerWidth && imgElement?.parentElement) {
			const resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					actualContainerWidth = entry.contentRect.width
				}
			})

			resizeObserver.observe(imgElement.parentElement)

			return () => {
				resizeObserver.disconnect()
			}
		}
	})

	// Smart image URL selection
	function getImageUrl(): string {
		if (!media.url) return ''

		// SVG files should always use the original URL (they're vector, no thumbnails needed)
		if (media.mimeType === 'image/svg+xml' || media.url.endsWith('.svg')) {
			return media.url
		}

		// For local development, use what we have
		if (media.url.startsWith('/local-uploads')) {
			// For larger containers, prefer original over thumbnail
			if (actualContainerWidth && actualContainerWidth > 400) {
				return media.url // Original image
			}
			return media.thumbnailUrl || media.url
		}

		// For Cloudinary images, we could implement smart URL generation here
		// For now, use the same logic as local
		if (actualContainerWidth && actualContainerWidth > 400) {
			return media.url
		}
		return media.thumbnailUrl || media.url
	}

	// Generate responsive srcset for better performance
	function getSrcSet(): string {
		// SVG files don't need srcset (they're vector and scale infinitely)
		if (media.mimeType === 'image/svg+xml' || media.url.endsWith('.svg')) {
			return ''
		}

		if (!media.url || media.url.startsWith('/local-uploads')) {
			// For local images, just provide the main options
			const sources = []
			if (media.thumbnailUrl) {
				sources.push(`${media.thumbnailUrl} 800w`)
			}
			if (media.url) {
				sources.push(`${media.url} ${media.width || 1920}w`)
			}
			return sources.join(', ')
		}

		// For Cloudinary, we could generate multiple sizes
		// This is a placeholder for future implementation
		return ''
	}

	// Compute styles
	function getImageStyles(): string {
		let styles = ''

		if (aspectRatio) {
			styles += `aspect-ratio: ${aspectRatio.replace(':', '/')};`
		}

		return styles
	}
</script>

<img
	bind:this={imgElement}
	src={imageUrl}
	{alt}
	class={className}
	style={getImageStyles()}
	{loading}
	srcset={srcSet || undefined}
	{sizes}
	width={media.width || undefined}
	height={media.height || undefined}
/>

<style>
	img {
		max-width: 100%;
		height: auto;
	}
</style>
