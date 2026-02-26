import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	try {
		// Forward preview token if present
		const preview = url.searchParams.get('preview')
		const apiUrl = preview
			? `/api/posts/by-slug/${params.slug}?preview=${encodeURIComponent(preview)}`
			: `/api/posts/by-slug/${params.slug}`

		const response = await fetch(apiUrl)

		if (!response.ok) {
			if (response.status === 404) {
				return {
					post: null,
					error: 'Post not found'
				}
			}
			throw new Error('Failed to fetch post')
		}

		const post = await response.json()

		return {
			post
		}
	} catch (error) {
		console.error('Error loading post:', error)
		return {
			post: null,
			error: 'Failed to load post'
		}
	}
}
