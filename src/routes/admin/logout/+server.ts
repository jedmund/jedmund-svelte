import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { clearSessionCookie } from '$lib/server/admin/session'

export const POST: RequestHandler = async ({ cookies }) => {
	clearSessionCookie(cookies)
	throw redirect(303, '/admin/login')
}

export const GET: RequestHandler = async ({ cookies }) => {
	clearSessionCookie(cookies)
	throw redirect(303, '/admin/login')
}
