import type { PageLoad } from './$types'
import { isValidCategory, getCategoryLabel } from '$lib/constants/garden'

export const load: PageLoad = async ({ fetch, params, url }) => {
	const { category } = params

	if (!isValidCategory(category)) {
		return {
			items: null,
			category,
			categoryLabel: category,
			error: 'Category not found',
			sort: 'display-order',
			bangers: false
		}
	}

	const sort = url.searchParams.get('sort') || 'display-order'
	const bangers = url.searchParams.get('bangers') === 'true'

	try {
		const apiUrl = new URL(`/api/garden/${category}`, url.origin)
		if (sort !== 'display-order') apiUrl.searchParams.set('sort', sort)
		if (bangers) apiUrl.searchParams.set('bangers', 'true')

		const res = await fetch(apiUrl.toString())
		const data = await res.json()
		return {
			items: data.items ?? [],
			category,
			categoryLabel: getCategoryLabel(category),
			sort,
			bangers
		}
	} catch {
		return {
			items: [],
			category,
			categoryLabel: getCategoryLabel(category),
			sort,
			bangers
		}
	}
}
