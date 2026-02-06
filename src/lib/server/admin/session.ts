import { dev } from '$app/environment'
import type { Cookies } from '@sveltejs/kit'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SessionUser } from '$lib/types/session'

const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 hours

interface SessionPayload {
	username: string
	exp: number
}

function sessionSecret(): string {
	const secret = process.env.ADMIN_SESSION_SECRET
	if (!secret) {
		if (dev) return 'dev-session-secret'
		throw new Error('ADMIN_SESSION_SECRET environment variable is required in production')
	}
	return secret
}

function signPayload(payload: string): Buffer {
	const hmac = createHmac('sha256', sessionSecret())
	hmac.update(payload)
	return hmac.digest()
}

function buildToken(payload: SessionPayload): string {
	const payloadStr = JSON.stringify(payload)
	const signature = signPayload(payloadStr).toString('base64url')
	return `${Buffer.from(payloadStr, 'utf8').toString('base64url')}.${signature}`
}

function parseToken(token: string): SessionPayload | null {
	const [encodedPayload, encodedSignature] = token.split('.')
	if (!encodedPayload || !encodedSignature) return null

	const payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf8')
	let payload: SessionPayload
	try {
		payload = JSON.parse(payloadStr)
		if (!payload || typeof payload.username !== 'string' || typeof payload.exp !== 'number') {
			return null
		}
	} catch {
		return null
	}

	const expectedSignature = signPayload(payloadStr)
	let providedSignature: Buffer
	try {
		providedSignature = Buffer.from(encodedSignature, 'base64url')
	} catch {
		return null
	}

	if (expectedSignature.length !== providedSignature.length) {
		return null
	}

	try {
		if (!timingSafeEqual(expectedSignature, providedSignature)) {
			return null
		}
	} catch {
		return null
	}

	if (Date.now() > payload.exp) {
		return null
	}

	return payload
}

export function validateAdminPassword(password: string): SessionUser | null {
	const expected = process.env.ADMIN_PASSWORD
	if (!expected) {
		if (dev) return null
		throw new Error('ADMIN_PASSWORD environment variable is required in production')
	}
	const providedBuf = Buffer.from(password)
	const expectedBuf = Buffer.from(expected)

	if (providedBuf.length !== expectedBuf.length) {
		return null
	}

	try {
		if (!timingSafeEqual(providedBuf, expectedBuf)) {
			return null
		}
	} catch {
		return null
	}

	return { username: 'admin' }
}

export function createSessionToken(user: SessionUser): string {
	const payload: SessionPayload = {
		username: user.username,
		exp: Date.now() + SESSION_TTL_SECONDS * 1000
	}
	return buildToken(payload)
}

export function readSessionToken(token: string | undefined): SessionUser | null {
	if (!token) return null
	const payload = parseToken(token)
	if (!payload) return null
	return { username: payload.username }
}

export function setSessionCookie(cookies: Cookies, user: SessionUser) {
	const token = createSessionToken(user)
	cookies.set(SESSION_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: SESSION_TTL_SECONDS
	})
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE_NAME, {
		path: '/'
	})
}

export function getSessionUser(cookies: Cookies): SessionUser | null {
	const token = cookies.get(SESSION_COOKIE_NAME)
	return readSessionToken(token)
}

export const ADMIN_SESSION_COOKIE = SESSION_COOKIE_NAME

// --- Project unlock cookies ---
// Allows visitors to unlock password-protected projects via server-verified password.
// Uses the same HMAC signing as admin sessions.

const PROJECT_UNLOCK_COOKIE = 'project_unlocks'
const PROJECT_UNLOCK_TTL = 60 * 60 * 24 // 24 hours

interface ProjectUnlockPayload {
	ids: number[]
	exp: number
}

function buildUnlockToken(payload: ProjectUnlockPayload): string {
	const payloadStr = JSON.stringify(payload)
	const signature = signPayload(payloadStr).toString('base64url')
	return `${Buffer.from(payloadStr, 'utf8').toString('base64url')}.${signature}`
}

function parseUnlockToken(token: string): ProjectUnlockPayload | null {
	const [encodedPayload, encodedSignature] = token.split('.')
	if (!encodedPayload || !encodedSignature) return null

	let payloadStr: string
	try {
		payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf8')
	} catch {
		return null
	}

	let payload: ProjectUnlockPayload
	try {
		payload = JSON.parse(payloadStr)
		if (!payload || !Array.isArray(payload.ids) || typeof payload.exp !== 'number') {
			return null
		}
	} catch {
		return null
	}

	const expectedSignature = signPayload(payloadStr)
	let providedSignature: Buffer
	try {
		providedSignature = Buffer.from(encodedSignature, 'base64url')
	} catch {
		return null
	}

	if (expectedSignature.length !== providedSignature.length) return null

	try {
		if (!timingSafeEqual(expectedSignature, providedSignature)) return null
	} catch {
		return null
	}

	if (Date.now() > payload.exp) return null

	return payload
}

export function getUnlockedProjectIds(cookies: Cookies): number[] {
	const token = cookies.get(PROJECT_UNLOCK_COOKIE)
	if (!token) return []
	const payload = parseUnlockToken(token)
	return payload?.ids ?? []
}

export function addProjectUnlock(cookies: Cookies, projectId: number) {
	const existing = getUnlockedProjectIds(cookies)
	const ids = existing.includes(projectId) ? existing : [...existing, projectId]
	const payload: ProjectUnlockPayload = {
		ids,
		exp: Date.now() + PROJECT_UNLOCK_TTL * 1000
	}
	cookies.set(PROJECT_UNLOCK_COOKIE, buildUnlockToken(payload), {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: PROJECT_UNLOCK_TTL
	})
}
