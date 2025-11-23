import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import {
	clearSessionCookie,
	setSessionCookie,
	validateAdminPassword
} from '$lib/server/admin/session'

export const load = (async ({ cookies }) => {
	// Ensure we start with a clean session when hitting the login page
	clearSessionCookie(cookies)

	return {
		form: {
			message: null
		}
	}
}) satisfies PageServerLoad

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData()
		const password = formData.get('password')

		if (typeof password !== 'string' || password.trim().length === 0) {
			return fail(400, {
				message: 'Password is required'
			})
		}

		const user = validateAdminPassword(password)
		if (!user) {
			return fail(401, {
				message: 'Invalid password'
			})
		}

		setSessionCookie(cookies, user)

		throw redirect(303, '/admin')
	}
} satisfies Actions
