import { prisma } from './database'
import { uploadFile } from './cloudinary'
import { logger } from './logger'

const FETCH_TIMEOUT_MS = 10000
const MAX_BYTES = 10 * 1024 * 1024
const BROWSER_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export interface DownloadedOgImage {
	mediaId: number
	url: string
}

/**
 * Download an og:image and store it as a Media record. Returns the hosted public url,
 * or null on any failure so callers can fall back to the original source url.
 * `referer` is the page the image was found on — some hosts require it to serve bytes.
 */
export async function downloadOgImage(
	sourceUrl: string,
	referer?: string
): Promise<DownloadedOgImage | null> {
	try {
		const response = await fetch(sourceUrl, {
			headers: {
				'User-Agent': BROWSER_UA,
				Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
				...(referer ? { Referer: referer } : {})
			},
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			redirect: 'follow'
		})

		if (!response.ok) {
			logger.info('og:image download skipped (non-2xx)', {
				sourceUrl,
				status: response.status
			})
			return null
		}

		const contentType = (response.headers.get('content-type') || '').split(';')[0].trim()
		if (!contentType.startsWith('image/')) {
			logger.info('og:image download skipped (non-image content-type)', {
				sourceUrl,
				contentType
			})
			return null
		}

		const buffer = Buffer.from(await response.arrayBuffer())
		if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
			logger.info('og:image download skipped (size out of bounds)', {
				sourceUrl,
				size: buffer.byteLength
			})
			return null
		}

		const filename = buildFilename(sourceUrl, contentType)
		const file = new File([buffer], filename, { type: contentType })

		const uploadResult = await uploadFile(file, 'media')
		if (!uploadResult.success || !uploadResult.secureUrl) {
			logger.error('og:image upload failed', new Error(uploadResult.error || 'unknown'))
			return null
		}

		const media = await prisma.media.create({
			data: {
				filename: file.name,
				originalName: sourceUrl.slice(0, 255),
				mimeType: file.type,
				size: buffer.byteLength,
				url: uploadResult.secureUrl,
				thumbnailUrl: uploadResult.thumbnailUrl,
				width: uploadResult.width,
				height: uploadResult.height,
				dominantColor: uploadResult.dominantColor,
				colors: uploadResult.colors,
				aspectRatio: uploadResult.aspectRatio,
				isPhotography: false,
				isLinkCardImage: true
			}
		})

		return { mediaId: media.id, url: media.url }
	} catch (err) {
		logger.error('og:image download errored', err as Error, { sourceUrl })
		return null
	}
}

function buildFilename(sourceUrl: string, contentType: string): string {
	const ext = extFromContentType(contentType)
	let base = 'og-image'
	try {
		const pathname = new URL(sourceUrl).pathname
		const tail = pathname.split('/').filter(Boolean).pop()
		if (tail) base = tail.replace(/\.[^.]+$/, '').slice(0, 80) || base
	} catch {
		// fall through
	}
	return `${base}.${ext}`
}

function extFromContentType(contentType: string): string {
	switch (contentType) {
		case 'image/jpeg':
			return 'jpg'
		case 'image/png':
			return 'png'
		case 'image/gif':
			return 'gif'
		case 'image/webp':
			return 'webp'
		case 'image/avif':
			return 'avif'
		case 'image/svg+xml':
			return 'svg'
		case 'image/x-icon':
		case 'image/vnd.microsoft.icon':
			return 'ico'
		default:
			return 'img'
	}
}
