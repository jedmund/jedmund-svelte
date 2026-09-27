import { decodeApiError, getErrorMessage } from '$lib/api/http'
import { error, redirect } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { getSessionUser, setSessionCookie } from '$lib/server/admin/session'

type FetchInput = Parameters<typeof fetch>[0]

export type AdminFetchOptions = RequestInit

export interface AdminFetchJsonOptions extends AdminFetchOptions {
	parse?: 'json' | 'text' | 'response'
}

export async function adminFetch(
	event: RequestEvent,
	input: FetchInput,
	options: AdminFetchOptions = {}
): Promise<Response> {
	const user = getSessionUser(event.cookies)
	if (!user) {
		throw redirect(303, '/admin/login')
	}

	// Refresh cookie attributes for active sessions
	setSessionCookie(event.cookies, user)

	const response = await event.fetch(input, options)

	if (response.status === 401) {
		throw redirect(303, '/admin/login')
	}

	if (!response.ok) {
		const body: unknown = await response
			.clone()
			.json()
			.catch(() => undefined)
		const failure = decodeApiError(response.status, body)
		throw error(response.status, getErrorMessage(failure))
	}

	return response
}

export async function adminFetchJson<T>(
	event: RequestEvent,
	input: FetchInput,
	options: AdminFetchJsonOptions = {}
): Promise<T> {
	const { parse = 'json', ...fetchOptions } = options
	const response = await adminFetch(event, input, fetchOptions)

	if (parse === 'text') {
		return (await response.text()) as unknown as T
	}

	if (parse === 'response') {
		return response as unknown as T
	}

	return response.json() as Promise<T>
}
