import 'dotenv/config'
import { dev } from '$app/environment'

const REQUIRED = ['ADMIN_SESSION_SECRET', 'ADMIN_PASSWORD', 'REDIS_URL', 'DATABASE_URL'] as const

type RequiredKey = (typeof REQUIRED)[number]

const DEV_OPTIONAL = new Set<RequiredKey>(['ADMIN_PASSWORD', 'REDIS_URL'])

function validate(): void {
	const missing: string[] = []
	for (const key of REQUIRED) {
		if (!process.env[key]) {
			if (dev && DEV_OPTIONAL.has(key)) {
				console.warn(`[env] ${key} not set — falling back to dev default`)
				continue
			}
			missing.push(key)
		}
	}
	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}. ` +
				'Set them before starting the server.'
		)
	}
}

validate()

export const env = {
	adminSessionSecret: process.env.ADMIN_SESSION_SECRET as string,
	adminPassword: process.env.ADMIN_PASSWORD,
	redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
	databaseUrl: process.env.DATABASE_URL as string,
	lastfmApiKey: process.env.LASTFM_API_KEY
}
