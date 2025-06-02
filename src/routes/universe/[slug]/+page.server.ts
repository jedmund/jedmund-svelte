import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, fetch }) => {
	try {
		// Fetch the specific post by slug from the database
		const response = await fetch(`/api/posts/by-slug/${params.slug}`)
		
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
