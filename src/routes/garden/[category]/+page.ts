import type { PageLoad } from './$types'
import { isValidCategory, getCategoryLabel } from '$lib/constants/garden'

export const load: PageLoad = async ({ fetch, params }) => {
	const { category } = params

	if (!isValidCategory(category)) {
		return { items: null, category, categoryLabel: category, error: 'Category not found' }
	}

	try {
		const res = await fetch(`/api/garden/${category}`)
		const data = await res.json()
		return {
			items: data.items ?? [],
			category,
			categoryLabel: getCategoryLabel(category)
		}
	} catch {
		return { items: [], category, categoryLabel: getCategoryLabel(category) }
	}
}
