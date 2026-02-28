import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const res = await fetch('/api/garden')
		const data = await res.json()
		return { items: data.items ?? [] }
	} catch {
		return { items: [] }
	}
}
