import { prisma } from '$lib/server/database'
import { postToBluesky } from '../bluesky/post'
import { postToMastodon } from '../mastodon/post'
import { getContentExcerpt } from '$lib/utils/content'
import { logger } from '../logger'
import { getConfig } from '../config'

interface ContentData {
	title?: string | null
	description?: string | null
	content?: unknown
	featuredImage?: string | null
	images?: { url: string; alt: string }[]
	slug: string
	contentType: string
}

const URL_PREFIXES: Record<string, string> = {
	post: '/universe',
	project: '/work',
	album: '/albums'
}

async function getCanonicalUrl(contentType: string, slug: string): Promise<string> {
	const base = (await getConfig('site.url')) || 'https://jedmund.com'
	const prefix = URL_PREFIXES[contentType] || ''
	return `${base}${prefix}/${slug}`
}

async function loadContent(contentType: string, contentId: number): Promise<ContentData | null> {
	switch (contentType) {
		case 'post': {
			const post = await prisma.post.findUnique({ where: { id: contentId } })
			if (!post || post.status !== 'published') return null

			const images: { url: string; alt: string }[] = []
			if (post.featuredImage) {
				images.push({ url: post.featuredImage, alt: post.title || '' })
			}
			if (post.attachments && Array.isArray(post.attachments)) {
				// Attachments are media IDs — resolve to URLs
				const mediaItems = await prisma.media.findMany({
					where: { id: { in: post.attachments as number[] } },
					select: { url: true, description: true }
				})
				for (const m of mediaItems) {
					if (!images.some(i => i.url === m.url)) {
						images.push({ url: m.url, alt: m.description || '' })
					}
				}
			}

			return {
				title: post.title,
				content: post.content,
				featuredImage: post.featuredImage,
				images,
				slug: post.slug,
				contentType: 'post'
			}
		}
		case 'project': {
			const project = await prisma.project.findUnique({ where: { id: contentId } })
			if (!project || project.status !== 'published') return null

			const images: { url: string; alt: string }[] = []
			if (project.featuredImage) {
				images.push({ url: project.featuredImage, alt: project.title })
			}

			return {
				title: project.title,
				description: project.description,
				content: project.caseStudyContent,
				featuredImage: project.featuredImage,
				images,
				slug: project.slug,
				contentType: 'project'
			}
		}
		case 'album': {
			const album = await prisma.album.findUnique({
				where: { id: contentId },
				include: {
					media: {
						orderBy: { displayOrder: 'asc' },
						take: 4,
						include: { media: { select: { url: true, description: true } } }
					}
				}
			})
			if (!album || album.status !== 'published') return null

			const images = album.media.map(am => ({
				url: am.media.url,
				alt: am.media.description || album.title
			}))

			return {
				title: album.title,
				description: album.description,
				content: album.content,
				images,
				slug: album.slug,
				contentType: 'album'
			}
		}
		default:
			return null
	}
}

async function formatForBluesky(data: ContentData): Promise<{ text: string; images?: { url: string; alt: string }[]; useExternalEmbed: boolean; title?: string; description?: string }> {
	const url = await getCanonicalUrl(data.contentType, data.slug)

	switch (data.contentType) {
		case 'post': {
			const isEssay = !!data.title
			if (isEssay) {
				const excerpt = getContentExcerpt(data.content, 200)
				return {
					text: data.title + '\n\n' + excerpt,
					images: data.images,
					useExternalEmbed: !data.images?.length,
					title: data.title || undefined,
					description: excerpt || undefined
				}
			}
			return {
				text: getContentExcerpt(data.content, 280),
				images: data.images,
				useExternalEmbed: false
			}
		}
		case 'project':
			return {
				text: 'New: ' + data.title + '\n\n' + (data.description || ''),
				images: data.images,
				useExternalEmbed: !data.images?.length,
				title: data.title || undefined,
				description: data.description || undefined
			}
		case 'album':
			return {
				text: data.title + (data.description ? '\n\n' + data.description : ''),
				images: data.images,
				useExternalEmbed: false
			}
		default:
			return { text: data.title || '', useExternalEmbed: false }
	}
}

function formatForMastodon(data: ContentData): { text: string; images?: { url: string; alt: string }[] } {
	switch (data.contentType) {
		case 'post': {
			const isEssay = !!data.title
			if (isEssay) {
				const excerpt = getContentExcerpt(data.content, 400)
				return {
					text: data.title + '\n\n' + excerpt,
					images: data.images
				}
			}
			return {
				text: getContentExcerpt(data.content, 480),
				images: data.images
			}
		}
		case 'project':
			return {
				text: 'New: ' + data.title + '\n\n' + (data.description || ''),
				images: data.images
			}
		case 'album':
			return {
				text: data.title + (data.description ? '\n\n' + data.description : ''),
				images: data.images
			}
		default:
			return { text: data.title || '' }
	}
}

async function syndicateTo(
	platform: 'bluesky' | 'mastodon',
	contentType: string,
	contentId: number,
	data: ContentData
): Promise<void> {
	const url = await getCanonicalUrl(data.contentType, data.slug)

	try {
		let externalId: string | undefined
		let externalUrl: string | undefined

		if (platform === 'bluesky') {
			const formatted = await formatForBluesky(data)
			const result = await postToBluesky({
				text: formatted.text,
				url,
				images: formatted.images,
				useExternalEmbed: formatted.useExternalEmbed,
				title: formatted.title,
				description: formatted.description
			})
			externalId = result.uri
			externalUrl = result.url
		} else {
			const formatted = formatForMastodon(data)
			const result = await postToMastodon({
				text: formatted.text,
				url,
				images: formatted.images
			})
			externalId = result.id
			externalUrl = result.url
		}

		// Record success
		await prisma.syndication.upsert({
			where: {
				contentType_contentId_platform: { contentType, contentId, platform }
			},
			create: {
				contentType,
				contentId,
				platform,
				externalId,
				externalUrl,
				status: 'success'
			},
			update: {
				externalId,
				externalUrl,
				status: 'success',
				errorMessage: null
			}
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		logger.error(`Syndication to ${platform} failed`, error as Error, { contentType, contentId: contentId.toString() })

		// Record failure
		await prisma.syndication.upsert({
			where: {
				contentType_contentId_platform: { contentType, contentId, platform }
			},
			create: {
				contentType,
				contentId,
				platform,
				status: 'failed',
				errorMessage
			},
			update: {
				status: 'failed',
				errorMessage
			}
		})
	}
}

export async function syndicateContent(contentType: string, contentId: number): Promise<void> {
	const content = await loadContent(contentType, contentId)
	if (!content) {
		logger.info('Skipping syndication: content not found or not published', { contentType, contentId: contentId.toString() })
		return
	}

	// Check for existing successful syndications to avoid duplicates
	const existing = await prisma.syndication.findMany({
		where: { contentType, contentId, status: 'success' }
	})
	const alreadySyndicated = new Set(existing.map(s => s.platform))

	const platforms: ('bluesky' | 'mastodon')[] = ['bluesky', 'mastodon']
	const toSyndicate = platforms.filter(p => !alreadySyndicated.has(p))

	if (toSyndicate.length === 0) {
		logger.info('Content already syndicated to all platforms', { contentType, contentId: contentId.toString() })
		return
	}

	await Promise.allSettled(
		toSyndicate.map(platform => syndicateTo(platform, contentType, contentId, content))
	)
}
