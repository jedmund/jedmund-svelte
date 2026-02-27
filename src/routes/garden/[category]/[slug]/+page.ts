import type { PageLoad } from './$types'
import { isValidCategory, getCategoryLabel } from '$lib/constants/garden'

export const load: PageLoad = async ({ fetch, params }) => {
	const { category, slug } = params

	if (!isValidCategory(category)) {
		return { item: null, error: 'Category not found' }
	}

	try {
		const res = await fetch(`/api/garden/${category}/${slug}`)
		if (!res.ok) {
			return { item: null, error: 'Item not found' }
		}
		const item = await res.json()
		return { item, categoryLabel: getCategoryLabel(category) }
	} catch {
		return { item: null, error: 'Failed to load item' }
	}
}
