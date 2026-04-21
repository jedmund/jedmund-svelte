import type { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'

export const ALBUM_COVER_INCLUDE = {
	media: {
		orderBy: { displayOrder: 'asc' as const },
		take: 1,
		include: {
			media: {
				select: {
					id: true,
					url: true,
					thumbnailUrl: true,
					width: true,
					height: true,
					dominantColor: true,
					colors: true,
					aspectRatio: true,
					photoCaption: true
				}
			}
		}
	},
	_count: { select: { media: true } }
} satisfies Prisma.AlbumInclude

export type AlbumWithCover = Prisma.AlbumGetPayload<{ include: typeof ALBUM_COVER_INCLUDE }>

const ALBUM_ORDER = [{ date: 'desc' as const }, { createdAt: 'desc' as const }]

interface ListParams {
	limit?: number
	offset?: number
}

export async function getPublishedAlbums({ limit = 50, offset = 0 }: ListParams = {}) {
	const where = { status: 'published' as const }
	const [albums, total] = await Promise.all([
		prisma.album.findMany({
			where,
			include: ALBUM_COVER_INCLUDE,
			orderBy: ALBUM_ORDER,
			skip: offset,
			take: limit
		}),
		prisma.album.count({ where })
	])
	return { albums, total }
}

export async function getAllAlbums({ limit = 50, offset = 0 }: ListParams = {}) {
	const [albums, total] = await Promise.all([
		prisma.album.findMany({
			include: ALBUM_COVER_INCLUDE,
			orderBy: ALBUM_ORDER,
			skip: offset,
			take: limit
		}),
		prisma.album.count()
	])
	return { albums, total }
}

// Shape matches what the public API used to emit via JSON.stringify — dates
// as ISO strings so server-loaded pages and API responses are identical.
export function toAlbumListItem(album: AlbumWithCover, { isAdmin }: { isAdmin: boolean }) {
	const cover = album.media[0]?.media
	const base = {
		id: album.id,
		slug: album.slug,
		title: album.title,
		description: album.description,
		date: album.date?.toISOString() ?? null,
		location: album.location,
		photoCount: album._count.media,
		coverPhoto: cover
			? {
					id: cover.id,
					url: cover.url,
					thumbnailUrl: cover.thumbnailUrl,
					width: cover.width,
					height: cover.height,
					dominantColor: cover.dominantColor,
					colors: cover.colors,
					aspectRatio: cover.aspectRatio,
					caption: cover.photoCaption
				}
			: null,
		hasContent: !!album.content
	}
	if (!isAdmin) return base
	return {
		...base,
		status: album.status,
		showInUniverse: album.showInUniverse,
		publishedAt: album.publishedAt?.toISOString() ?? null,
		createdAt: album.createdAt.toISOString(),
		updatedAt: album.updatedAt.toISOString(),
		coverPhotoId: album.coverPhotoId,
		photos: album.media.map((m) => ({
			id: m.media.id,
			url: m.media.url,
			thumbnailUrl: m.media.thumbnailUrl,
			caption: m.media.photoCaption
		})),
		_count: album._count
	}
}
