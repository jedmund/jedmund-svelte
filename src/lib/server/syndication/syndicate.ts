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
	excerpt?: string | null
	syndicationText?: string | null
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
				excerpt: post.excerpt,
				syndicationText: post.syndicationText,
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

interface FormattedPost {
	text: string
	images?: { url: string; alt: string }[]
	useExternalEmbed: boolean
	title?: string
	description?: string
}

const SYNDICATION_TEXT_LIMIT = 240

function truncateText(text: string, limit: number): string {
	if (text.length <= limit) return text
	return text.substring(0, limit - 3).trim() + '...'
}

function formatForPlatform(platform: 'bluesky' | 'mastodon', data: ContentData): FormattedPost {
	const supportsEmbed = platform === 'bluesky'

	// Priority 1: Custom syndication message
	if (data.syndicationText) {
		return {
			text: data.syndicationText,
			images: data.images,
			useExternalEmbed: supportsEmbed && !data.images?.length,
			title: supportsEmbed ? (data.title || undefined) : undefined,
			description: undefined
		}
	}

	// Priority 2+: Content-type specific fallbacks
	switch (data.contentType) {
		case 'post': {
			const isEssay = !!data.title
			if (isEssay) {
				// Essays: excerpt or just title (no content excerpt)
				const text = data.excerpt
					? truncateText(data.title + '\n\n' + data.excerpt, SYNDICATION_TEXT_LIMIT)
					: truncateText(data.title!, SYNDICATION_TEXT_LIMIT)
				return {
					text,
					images: data.images,
					useExternalEmbed: supportsEmbed && !data.images?.length,
					title: supportsEmbed ? (data.title || undefined) : undefined,
					description: supportsEmbed ? (data.excerpt || undefined) : undefined
				}
			}
			// Regular posts: excerpt or truncated content
			const postText = data.excerpt
				|| getContentExcerpt(data.content, SYNDICATION_TEXT_LIMIT)
			return {
				text: truncateText(postText, SYNDICATION_TEXT_LIMIT),
				images: data.images,
				useExternalEmbed: false
			}
		}
		case 'project': {
			const projectText = 'New: ' + data.title + (data.description ? '\n\n' + data.description : '')
			return {
				text: truncateText(projectText, SYNDICATION_TEXT_LIMIT),
				images: data.images,
				useExternalEmbed: supportsEmbed && !data.images?.length,
				title: supportsEmbed ? (data.title || undefined) : undefined,
				description: supportsEmbed ? (data.description || undefined) : undefined
			}
		}
		case 'album': {
			const albumText = data.title + (data.description ? '\n\n' + data.description : '')
			return {
				text: truncateText(albumText, SYNDICATION_TEXT_LIMIT),
				images: data.images,
				useExternalEmbed: false
			}
		}
		default:
			return { text: truncateText(data.title || '', SYNDICATION_TEXT_LIMIT), useExternalEmbed: false }
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

		const formatted = formatForPlatform(platform, data)

		if (platform === 'bluesky') {
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
			const result = await postToMastodon({
				text: formatted.text,
				url,
				images: formatted.images
			})
			externalId = result.id
			externalUrl = result.url
		}

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
