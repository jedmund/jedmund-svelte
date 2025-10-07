import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { getSessionUser } from '$lib/server/admin/session'

const LOGIN_PATH = '/admin/login'
const DASHBOARD_PATH = '/admin'

function isLoginRoute(pathname: string) {
	return pathname === LOGIN_PATH
}

export const load = (async (event) => {
	const user = getSessionUser(event.cookies)
	const pathname = event.url.pathname

	if (!user && !isLoginRoute(pathname)) {
		throw redirect(303, LOGIN_PATH)
	}

	if (user && isLoginRoute(pathname)) {
		throw redirect(303, DASHBOARD_PATH)
	}

	return { user }
}) satisfies LayoutServerLoad
