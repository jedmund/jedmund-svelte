import { scrapeOgMetadata, type OgMetadata } from './og-metadata'
import { downloadOgImage, type DownloadedOgImage } from './og-image-download'

interface UrlEmbedAttrs {
	url?: string
	title?: string
	description?: string
	image?: string
	imageMediaId?: number
	favicon?: string
	faviconMediaId?: number
	siteName?: string
	[key: string]: unknown
}

interface RichTextNode {
	type?: string
	attrs?: UrlEmbedAttrs
	content?: RichTextNode[]
	[key: string]: unknown
}

export async function enrichUrlEmbeds(content: unknown): Promise<void> {
	if (!content || typeof content !== 'object') return

	const nodes: RichTextNode[] = []
	collectMissing(content as RichTextNode, nodes)
	if (nodes.length === 0) return

	const unique = new Map<string, RichTextNode[]>()
	for (const node of nodes) {
		const url = node.attrs?.url
		if (!url) continue
		const bucket = unique.get(url) ?? []
		bucket.push(node)
		unique.set(url, bucket)
	}

	await Promise.all(
		[...unique.entries()].map(async ([url, targets]) => {
			try {
				const metadata = await scrapeOgMetadata(url)
				const [hostedImage, hostedFavicon] = await Promise.all([
					downloadIfRemote(metadata.image, url),
					downloadIfRemote(metadata.favicon, url)
				])
				for (const node of targets) {
					applyMetadata(node, metadata, hostedImage, hostedFavicon)
				}
			} catch (err) {
				console.error(`Failed to enrich urlEmbed for ${url}:`, err)
			}
		})
	)
}

async function downloadIfRemote(
	imageUrl: string | null,
	referer: string
): Promise<DownloadedOgImage | null> {
	if (!imageUrl || isLocallyHosted(imageUrl)) return null
	return downloadOgImage(imageUrl, referer)
}

function isLocallyHosted(imageUrl: string): boolean {
	return imageUrl.startsWith('/local-uploads/') || imageUrl.startsWith('/api/media/')
}

function collectMissing(node: RichTextNode, out: RichTextNode[]): void {
	if (!node) return

	if (node.type === 'urlEmbed' && node.attrs?.url && needsEnrichment(node.attrs)) {
		out.push(node)
	}

	if (Array.isArray(node.content)) {
		for (const child of node.content) {
			collectMissing(child, out)
		}
	}
}

function needsEnrichment(attrs: UrlEmbedAttrs): boolean {
	if (!attrs.title) return true
	if (!attrs.image || !isLocallyHosted(attrs.image)) return true
	// Favicon is optional, but if present it should also be self-hosted.
	if (attrs.favicon && !isLocallyHosted(attrs.favicon)) return true
	return false
}

function applyMetadata(
	node: RichTextNode,
	metadata: OgMetadata,
	hostedImage: DownloadedOgImage | null,
	hostedFavicon: DownloadedOgImage | null
): void {
	const attrs: UrlEmbedAttrs = { ...(node.attrs ?? {}) }
	if (!attrs.title && metadata.title) attrs.title = metadata.title
	if (!attrs.description && metadata.description) attrs.description = metadata.description

	if (hostedImage) {
		attrs.image = hostedImage.url
		attrs.imageMediaId = hostedImage.mediaId
	} else if (!attrs.image && metadata.image) {
		attrs.image = metadata.image
	}

	if (hostedFavicon) {
		attrs.favicon = hostedFavicon.url
		attrs.faviconMediaId = hostedFavicon.mediaId
	} else if (!attrs.favicon && metadata.favicon) {
		attrs.favicon = metadata.favicon
	}

	if (!attrs.siteName && metadata.siteName) attrs.siteName = metadata.siteName
	node.attrs = attrs
}
