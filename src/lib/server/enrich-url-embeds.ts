import { scrapeOgMetadata, type OgMetadata } from './og-metadata'
import { downloadOgImage } from './og-image-download'

interface UrlEmbedAttrs {
	url?: string
	title?: string
	description?: string
	image?: string
	imageMediaId?: number
	favicon?: string
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
				const hosted =
					metadata.image && !isLocallyHosted(metadata.image)
						? await downloadOgImage(metadata.image, url)
						: null
				for (const node of targets) {
					applyMetadata(node, metadata, hosted)
				}
			} catch (err) {
				console.error(`Failed to enrich urlEmbed for ${url}:`, err)
			}
		})
	)
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
	if (!attrs.image) return true
	// Legacy/hotlinked images should be re-hosted on our own storage.
	if (!isLocallyHosted(attrs.image)) return true
	return false
}

function applyMetadata(
	node: RichTextNode,
	metadata: OgMetadata,
	hosted: { mediaId: number; url: string } | null
): void {
	const attrs: UrlEmbedAttrs = { ...(node.attrs ?? {}) }
	if (!attrs.title && metadata.title) attrs.title = metadata.title
	if (!attrs.description && metadata.description) attrs.description = metadata.description

	if (hosted) {
		attrs.image = hosted.url
		attrs.imageMediaId = hosted.mediaId
	} else if (!attrs.image && metadata.image) {
		attrs.image = metadata.image
	}

	if (!attrs.favicon && metadata.favicon) attrs.favicon = metadata.favicon
	if (!attrs.siteName && metadata.siteName) attrs.siteName = metadata.siteName
	node.attrs = attrs
}
