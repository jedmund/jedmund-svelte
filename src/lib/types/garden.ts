import type { GardenCategory } from '$lib/constants/garden'

export interface TypeaheadResult {
	id: string | number
	name: string
	subtitle: string | null
	image: string | null
	creator: string | null
}

export interface TypeaheadSelection {
	category: GardenCategory
	result: TypeaheadResult
}

export interface CategorySearchConfig {
	endpoint: string
	placeholder: string
	emptyText: string
	mapResult: (raw: any) => TypeaheadResult
}
