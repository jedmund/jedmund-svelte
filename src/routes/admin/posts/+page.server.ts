import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { adminFetch, adminFetchJson } from '$lib/server/admin/authenticated-fetch'
import type { AdminPost } from '$lib/types/admin'

interface PostsResponse {
	posts: AdminPost[]
}

function toStatusCounts(posts: AdminPost[]) {
	return posts.reduce(
		(counts, post) => {
			counts.all += 1
			counts[post.status as 'draft' | 'published'] += 1
			return counts
		},
		{ all: 0, published: 0, draft: 0 }
	)
}

function toTypeCounts(posts: AdminPost[]) {
	return posts.reduce(
		(counts, post) => {
			counts.all += 1
			if (post.postType === 'post') counts.post += 1
			if (post.postType === 'essay') counts.essay += 1
			return counts
		},
		{ all: 0, post: 0, essay: 0 }
	)
}

export const load = (async (event) => {
	event.depends('admin:posts')

	const { posts } = await adminFetchJson<PostsResponse>(event, '/api/posts')

	return {
		items: posts,
		filters: {
			statusCounts: toStatusCounts(posts),
			typeCounts: toTypeCounts(posts)
		}
	}
}) satisfies PageServerLoad

export const actions = {
	toggleStatus: async (event) => {
		const formData = await event.request.formData()
		const id = Number(formData.get('id'))
		const status = formData.get('status')
		const updatedAt = formData.get('updatedAt')

		if (!Number.isFinite(id) || typeof status !== 'string' || typeof updatedAt !== 'string') {
			return fail(400, { message: 'Invalid toggle request' })
		}

		await adminFetch(event, `/api/posts/${id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				status,
				updatedAt
			})
		})

		return { success: true }
	},
	delete: async (event) => {
		const formData = await event.request.formData()
		const id = Number(formData.get('id'))

		if (!Number.isFinite(id)) {
			return fail(400, { message: 'Invalid post id' })
		}

		await adminFetch(event, `/api/posts/${id}`, {
			method: 'DELETE'
		})

		return { success: true }
	}
} satisfies Actions
