import type { CategorySearchConfig, TypeaheadResult } from '$lib/types/garden'

export const GARDEN_CATEGORIES = [
	{ value: 'books', label: 'Books', singular: 'Book' },
	{ value: 'movies', label: 'Movies', singular: 'Movie' },
	{ value: 'music', label: 'Music', singular: 'Music' },
	{ value: 'games', label: 'Games', singular: 'Game' },
	{ value: 'manga', label: 'Manga', singular: 'Manga' },
	{ value: 'tv-shows', label: 'TV Shows', singular: 'TV Show' },
	{ value: 'devices', label: 'Devices', singular: 'Device' },
	{ value: 'other', label: 'Other', singular: 'Other' }
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
		case 'books':
			return 'Author'
		case 'movies':
			return 'Director'
		case 'music':
			return 'Artist'
		case 'games':
			return 'Developer'
		case 'manga':
			return 'Author'
		case 'tv-shows':
			return 'Creator'
		case 'devices':
			return 'Manufacturer'
		case 'other':
			return 'Creator'
		default:
			return 'Creator'
	}
}

function formatSubtitle(creator: string | null, year: string | null): string | null {
	return [creator, year].filter(Boolean).join(' \u00B7 ') || null
}

export const SEARCH_CONFIGS: Partial<Record<GardenCategory, CategorySearchConfig>> = {
	books: {
		endpoint: '/api/admin/garden/search/books',
		placeholder: 'Search for a book...',
		emptyText: 'No books found',
		mapResult: (raw): TypeaheadResult => ({
			id: raw.id,
			name: raw.name,
			subtitle: formatSubtitle(raw.author, raw.year),
			image: raw.image,
			creator: raw.author,
			year: raw.year ?? null,
			sourceId: raw.sourceId ?? String(raw.id),
			metadata: null,
			summary: raw.summary ?? null
		})
	},
	games: {
		endpoint: '/api/admin/garden/search/games',
		placeholder: 'Search for a game...',
		emptyText: 'No games found',
		mapResult: (raw): TypeaheadResult => ({
			id: raw.id,
			name: raw.name,
			subtitle: formatSubtitle(raw.developer, raw.year),
			image: raw.image,
			creator: raw.developer,
			year: raw.year ?? null,
			sourceId: raw.sourceId ?? String(raw.id),
			metadata: null,
			summary: raw.summary ?? null
		})
	},
	music: {
		endpoint: '/api/admin/garden/search/music',
		placeholder: 'Search for an album...',
		emptyText: 'No albums found',
		mapResult: (raw): TypeaheadResult => ({
			id: raw.id,
			name: raw.name,
			subtitle: formatSubtitle(raw.artist, raw.year),
			image: raw.image,
			creator: raw.artist,
			year: raw.year ?? null,
			sourceId: raw.sourceId ?? String(raw.id),
			metadata: null,
			summary: raw.summary ?? null
		})
	},
	manga: {
		endpoint: '/api/admin/garden/search/manga',
		placeholder: 'Search for a manga...',
		emptyText: 'No manga found',
		mapResult: (raw): TypeaheadResult => ({
			id: raw.id,
			name: raw.name,
			subtitle: formatSubtitle(raw.author, raw.year),
			image: raw.image,
			creator: raw.author,
			year: raw.year ?? null,
			sourceId: raw.sourceId ?? String(raw.id),
			metadata: raw.metadata ?? null,
			summary: raw.summary ?? null
		})
	},
	movies: {
		endpoint: '/api/admin/garden/search/movies',
		placeholder: 'Search for a movie...',
		emptyText: 'No movies found',
		mapResult: (raw): TypeaheadResult => ({
			id: raw.id,
			name: raw.name,
			subtitle: formatSubtitle(raw.director, raw.year),
			image: raw.image,
			creator: raw.director,
			year: raw.year ?? null,
			sourceId: raw.sourceId ?? String(raw.id),
			metadata: raw.metadata ?? null,
			summary: raw.summary ?? null
		})
	},
	'tv-shows': {
		endpoint: '/api/admin/garden/search/tv',
		placeholder: 'Search for a TV show...',
		emptyText: 'No TV shows found',
		mapResult: (raw): TypeaheadResult => ({
			id: raw.id,
			name: raw.name,
			subtitle: [raw.year, raw.originalName].filter(Boolean).join(' \u00B7 ') || null,
			image: raw.image,
			creator: null,
			year: raw.year ?? null,
			sourceId: raw.sourceId ?? String(raw.id),
			metadata: raw.metadata ?? null,
			summary: raw.summary ?? null
		})
	}
}

export function getExternalUrl(category: string, sourceId: string): string | null {
	switch (category) {
		case 'games':
			return `https://www.igdb.com/games/${sourceId}`
		case 'music':
			return `https://music.apple.com/album/${sourceId}`
		case 'manga':
			return `https://anilist.co/manga/${sourceId}`
		case 'movies':
			return `https://www.themoviedb.org/movie/${sourceId}`
		case 'tv-shows':
			return `https://thetvdb.com/series/${sourceId}`
		case 'books':
			return `https://openlibrary.org${sourceId}`
		default:
			return null
	}
}

export function createSearchFn(
	config: CategorySearchConfig
): (query: string, limit?: number) => Promise<TypeaheadResult[]> {
	return async (query: string, limit = 5) => {
		const res = await fetch(
			`${config.endpoint}?q=${encodeURIComponent(query)}&limit=${limit}`
		)
		const data = await res.json()
		return (data.results || []).map(config.mapResult)
	}
}
