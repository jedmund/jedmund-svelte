import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch, url }) => {
	const tags = url.searchParams.get('tags') || ''

	try {
		const params = new URLSearchParams({ limit: '20' })
		if (tags) params.set('tags', tags)

		const response = await fetch(`/api/universe?${params}`)
		if (!response.ok) {
			throw new Error('Failed to fetch universe feed')
		}

		const data = await response.json()
		return {
			universeItems: data.items || [],
			pagination: data.pagination || null,
			activeTags: tags
		}
	} catch (error) {
		console.error('Error loading universe feed:', error)
		return {
			universeItems: [],
			pagination: null,
			activeTags: tags,
			error: 'Failed to load universe feed'
		}
	}
}
