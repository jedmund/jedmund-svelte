import { invalidInput, MAX_DATABASE_INT } from '../api/validation'

export class PaginationError extends Error {
	constructor(public readonly field: string) {
		super(`Invalid ${field}`)
	}
	response(): Response {
		return invalidInput(this.message, {
			fieldErrors: { [this.field]: [this.message] },
			formErrors: []
		})
	}
}

function integer(url: URL, field: string, fallback: number, minimum: number, maximum: number) {
	const raw = url.searchParams.get(field)
	if (raw === null) return fallback
	const value = Number(raw)
	if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
		throw new PaginationError(field)
	}
	return value
}

export interface PaginationParams {
	page: number
	limit: number
}
export function getPaginationParams(url: URL): PaginationParams {
	const page = integer(url, 'page', 1, 1, MAX_DATABASE_INT)
	const limit = integer(url, 'limit', 20, 1, 100)
	if ((page - 1) * limit > MAX_DATABASE_INT) throw new PaginationError('page')
	return { page, limit }
}

export interface OffsetPaginationParams {
	limit: number
	offset: number
}
export function getOffsetPaginationParams(
	url: URL,
	defaults: { limit?: number; maxLimit?: number } = {}
): OffsetPaginationParams {
	return {
		limit: integer(url, 'limit', defaults.limit ?? 50, 1, defaults.maxLimit ?? 100),
		offset: integer(url, 'offset', 0, 0, MAX_DATABASE_INT)
	}
}
