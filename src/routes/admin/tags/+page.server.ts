import type { PageServerLoad } from './$types'
import { adminFetchJson } from '$lib/server/admin/authenticated-fetch'

interface Tag {
	id: number
	name: string
	displayName: string
	slug: string
	description: string | null
	usageCount: number
	createdAt: string
	updatedAt: string
}

interface TagsResponse {
	tags: Tag[]
	pagination: {
		total: number
		page: number
		limit: number
		totalPages: number
	}
}

export const load = (async (event) => {
	event.depends('admin:tags')

	const { tags, pagination } = await adminFetchJson<TagsResponse>(
		event,
		'/api/tags?limit=1000&sort=name&order=asc'
	)

	return {
		tags,
		pagination
	}
}) satisfies PageServerLoad
