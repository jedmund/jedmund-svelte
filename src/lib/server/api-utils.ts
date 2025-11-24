import type { RequestEvent } from '@sveltejs/kit'
import { getSessionUser } from '$lib/server/admin/session'

// Response helpers
export function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	})
}

export function errorResponse(message: string, status = 400): Response {
	return jsonResponse({ error: message }, status)
}

// Pagination helper
export interface PaginationParams {
	page?: number
	limit?: number
}

export function getPaginationParams(url: URL): PaginationParams {
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))

	return { page, limit }
}

export function getPaginationMeta(total: number, page: number, limit: number) {
	const totalPages = Math.ceil(total / limit)

	return {
		total,
		page,
		limit,
		totalPages,
		hasNext: page < totalPages,
		hasPrev: page > 1
	}
}

// Status validation
export const VALID_STATUSES = ['draft', 'published'] as const
export type Status = (typeof VALID_STATUSES)[number]

export function isValidStatus(status: unknown): status is Status {
	return VALID_STATUSES.includes(status)
}

// Post type validation
export const VALID_POST_TYPES = ['post', 'essay'] as const
export type PostType = (typeof VALID_POST_TYPES)[number]

export function isValidPostType(type: unknown): type is PostType {
	return VALID_POST_TYPES.includes(type)
}

// Request body parser with error handling
export async function parseRequestBody<T>(request: Request): Promise<T | null> {
	try {
		const body = await request.json()
		return body as T
	} catch (_error) {
		return null
	}
}

// Date helpers
export function toISOString(date: Date | string | null | undefined): string | null {
	if (!date) return null
	return new Date(date).toISOString()
}

// Session-based admin auth check
export function checkAdminAuth(event: RequestEvent): boolean {
	return Boolean(getSessionUser(event.cookies))
}

// CORS headers for API routes
export const corsHeaders = {
	'Access-Control-Allow-Origin': '*', // Update this in production
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
