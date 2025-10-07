import type { Actions, PageServerLoad } from './$types'
import { adminFetchJson } from '$lib/server/admin/authenticated-fetch'
import type { Media } from '@prisma/client'

interface MediaResponse {
	media: Media[]
	pagination: {
		page: number
		totalPages: number
		total: number
		limit: number
		hasNext: boolean
		hasPrev: boolean
	}
}

function buildQueryString(url: URL) {
	const params = new URLSearchParams()

	const page = url.searchParams.get('page')
	if (page) params.set('page', page)

	const limit = url.searchParams.get('limit')
	if (limit) params.set('limit', limit)

	const mimeType = url.searchParams.get('mimeType')
	if (mimeType) params.set('mimeType', mimeType)

	const publishedFilter = url.searchParams.get('publishedFilter')
	if (publishedFilter) params.set('publishedFilter', publishedFilter)

	const sort = url.searchParams.get('sort')
	if (sort) params.set('sort', sort)

	const search = url.searchParams.get('search')
	if (search) params.set('search', search)

	const albumId = url.searchParams.get('albumId')
	if (albumId) params.set('albumId', albumId)

	const unused = url.searchParams.get('unused')
	if (unused) params.set('unused', unused)

	return params.toString()
}

export const load = (async (event) => {
	event.depends('admin:media')

	const query = buildQueryString(event.url)
	const base = query ? `/api/media?${query}` : '/api/media'
	const data = await adminFetchJson<MediaResponse>(event, base)

	return {
		items: data.media,
		pagination: data.pagination
	}
}) satisfies PageServerLoad

export const actions = {} satisfies Actions
