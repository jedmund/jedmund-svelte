export const GARDEN_CATEGORIES = [
	{ value: 'book', label: 'Books', singular: 'Book' },
	{ value: 'movie', label: 'Movies', singular: 'Movie' },
	{ value: 'music', label: 'Music', singular: 'Music' },
	{ value: 'game', label: 'Games', singular: 'Game' },
	{ value: 'tv_show', label: 'TV Shows', singular: 'TV Show' },
	{ value: 'device', label: 'Devices', singular: 'Device' }
] as const

export type GardenCategory = (typeof GARDEN_CATEGORIES)[number]['value']

export function getCategoryLabel(value: string): string {
	const cat = GARDEN_CATEGORIES.find((c) => c.value === value)
	return cat?.label ?? value
}

export function getCategoryByValue(value: string) {
	return GARDEN_CATEGORIES.find((c) => c.value === value)
}

export function isValidCategory(value: string): value is GardenCategory {
	return GARDEN_CATEGORIES.some((c) => c.value === value)
}

export function getCreatorLabel(category: string): string {
	switch (category) {
		case 'book':
			return 'Author'
		case 'movie':
			return 'Director'
		case 'music':
			return 'Artist'
		case 'game':
			return 'Developer'
		case 'tv_show':
			return 'Creator'
		case 'device':
			return 'Manufacturer'
		default:
			return 'Creator'
	}
}
