import type { RequestEvent } from '@sveltejs/kit'
import { getSessionUser } from '$lib/server/admin/session'
import { codeForStatus } from '$lib/server/error-codes'

/**
 * Mutation response contract
 * -----------------------------------------------------------------------------
 * API routes (`/api/*` — returns a Response):
 *   • success:      return jsonResponse(data, status?)
 *                   DELETE success: return jsonResponse({ success: true })
 *   • error:        return errorResponse(message, status, details?)
 *                   body is always { error: { code, message, details? } }
 *
 * Form actions (`actions` in +page.server.ts):
 *   • success:      return action data, or throw redirect(303, path)
 *   • error:        return fail(status, { message })
 *
 * Never mix shapes: form actions don't emit `errorResponse`, API routes don't
 * call `fail()`. See A-14/A-15 in the architecture audit for context.
 * -----------------------------------------------------------------------------
 */

// Response helpers
export function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	})
}

export function errorResponse(message: string, status = 400, details?: unknown): Response {
	const body: { error: { code: string; message: string; details?: unknown } } = {
		error: { code: codeForStatus(status), message }
	}
	if (details !== undefined) body.error.details = details
	return jsonResponse(body, status)
}

export { getPaginationParams, getOffsetPaginationParams, PaginationError } from './pagination'
export type { PaginationParams, OffsetPaginationParams } from './pagination'

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

export function getOffsetPaginationMeta(total: number, limit: number, offset: number) {
	return {
		total,
		limit,
		offset,
		hasMore: offset + limit < total
	}
}

// Status validation
export const VALID_STATUSES = ['draft', 'published'] as const
export type Status = (typeof VALID_STATUSES)[number]

export function isValidStatus(status: unknown): status is Status {
	return VALID_STATUSES.includes(status as Status)
}

// Post type validation
export const VALID_POST_TYPES = ['post', 'essay'] as const
export type PostType = (typeof VALID_POST_TYPES)[number]

export function isValidPostType(type: unknown): type is PostType {
	return VALID_POST_TYPES.includes(type as PostType)
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
