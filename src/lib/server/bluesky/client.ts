import { AtpAgent } from '@atproto/api'
import { CacheManager } from '../cache-manager'
import { logger } from '../logger'
import { getConfig } from '../config'

let agent: AtpAgent | null = null

async function getAgent(): Promise<AtpAgent> {
	if (agent) return agent

	agent = new AtpAgent({ service: 'https://bsky.social' })

	// Try to restore session from cache
	const cachedSession = await CacheManager.get('bluesky-session', 'default')
	if (cachedSession) {
		try {
			const session = JSON.parse(cachedSession)
			await agent.resumeSession(session)
			logger.info('Bluesky session restored from cache')
			return agent
		} catch {
			logger.info('Cached Bluesky session expired, re-authenticating')
		}
	}

	// Authenticate fresh
	await authenticate()
	return agent
}

async function authenticate(): Promise<void> {
	if (!agent) {
		agent = new AtpAgent({ service: 'https://bsky.social' })
	}

	const handle = await getConfig('bluesky.handle')
	const appPassword = await getConfig('bluesky.app_password')
	const did = await getConfig('bluesky.did')

	if (!appPassword || (!handle && !did)) {
		throw new Error('Bluesky credentials not configured (bluesky.handle or bluesky.did, bluesky.app_password)')
	}

	try {
		// Prefer DID for login — custom domain handles can fail handle resolution
		const response = await agent.login({
			identifier: did || handle!,
			password: appPassword
		})

		// Cache the session
		if (response.data) {
			await CacheManager.set(
				'bluesky-session',
				'default',
				JSON.stringify(response.data)
			)
		}

		logger.info('Bluesky authenticated', { handle })
	} catch (error) {
		agent = null
		logger.error('Bluesky authentication failed', error as Error)
		throw error
	}
}

export async function getBlueskyAgent(): Promise<AtpAgent> {
	const a = await getAgent()

	// Verify session is still valid by checking if we have a session
	if (!a.session) {
		agent = null
		return getAgent()
	}

	return a
}
