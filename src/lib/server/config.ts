import { prisma } from '$lib/server/database'
import { logger } from './logger'

// Setting key → env var mapping
const ENV_VAR_MAP: Record<string, string> = {
	'site.url': 'SITE_URL',
	'lastfm.api_key': 'LASTFM_API_KEY',
	'cloudinary.cloud_name': 'CLOUDINARY_CLOUD_NAME',
	'cloudinary.api_key': 'CLOUDINARY_API_KEY',
	'cloudinary.api_secret': 'CLOUDINARY_API_SECRET',
	'apple_music.team_id': 'APPLE_MUSIC_TEAM_ID',
	'apple_music.key_id': 'APPLE_MUSIC_KEY_ID',
	'apple_music.private_key': 'APPLE_MUSIC_PRIVATE_KEY',
	'bluesky.handle': 'BLUESKY_HANDLE',
	'bluesky.app_password': 'BLUESKY_APP_PASSWORD',
	'bluesky.did': 'BLUESKY_DID',
	'mastodon.instance': 'MASTODON_INSTANCE',
	'mastodon.access_token': 'MASTODON_ACCESS_TOKEN'
}

// Which keys are secrets (masked in UI)
const SECRET_KEYS = new Set([
	'lastfm.api_key',
	'cloudinary.api_key',
	'cloudinary.api_secret',
	'apple_music.team_id',
	'apple_music.key_id',
	'apple_music.private_key',
	'bluesky.app_password',
	'mastodon.access_token'
])

// All known setting keys with their sections
export const SETTING_DEFINITIONS: Array<{
	key: string
	section: string
	isSecret: boolean
}> = [
	{ key: 'site.name', section: 'general', isSecret: false },
	{ key: 'site.url', section: 'general', isSecret: false },
	{ key: 'seo.default_title', section: 'seo', isSecret: false },
	{ key: 'seo.default_description', section: 'seo', isSecret: false },
	{ key: 'seo.default_og_image', section: 'seo', isSecret: false },
	{ key: 'seo.twitter_handle', section: 'seo', isSecret: false },
	{ key: 'seo.locale', section: 'seo', isSecret: false },
	{ key: 'lastfm.api_key', section: 'integrations', isSecret: true },
	{ key: 'cloudinary.cloud_name', section: 'integrations', isSecret: false },
	{ key: 'cloudinary.api_key', section: 'integrations', isSecret: true },
	{ key: 'cloudinary.api_secret', section: 'integrations', isSecret: true },
	{ key: 'apple_music.team_id', section: 'integrations', isSecret: true },
	{ key: 'apple_music.key_id', section: 'integrations', isSecret: true },
	{ key: 'apple_music.private_key', section: 'integrations', isSecret: true },
	{ key: 'bluesky.handle', section: 'syndication', isSecret: false },
	{ key: 'bluesky.app_password', section: 'syndication', isSecret: true },
	{ key: 'bluesky.did', section: 'syndication', isSecret: false },
	{ key: 'mastodon.instance', section: 'syndication', isSecret: false },
	{ key: 'mastodon.access_token', section: 'syndication', isSecret: true }
]

const MASKED_VALUE = '••••••••'
const CACHE_TTL_MS = 30_000

// In-memory cache
const cache = new Map<string, { value: string | null; expiresAt: number }>()

export async function getConfig(key: string): Promise<string | null> {
	// Check in-memory cache
	const cached = cache.get(key)
	if (cached && cached.expiresAt > Date.now()) {
		return cached.value
	}

	// Try database
	try {
		const setting = await prisma.setting.findUnique({ where: { key } })
		if (setting) {
			cache.set(key, { value: setting.value, expiresAt: Date.now() + CACHE_TTL_MS })
			return setting.value
		}
	} catch (error) {
		logger.error('Failed to read setting from DB, falling back to env', error as Error, { key })
	}

	// Fall back to env var
	const envKey = ENV_VAR_MAP[key]
	if (envKey) {
		const envValue = process.env[envKey] ?? null
		cache.set(key, { value: envValue, expiresAt: Date.now() + CACHE_TTL_MS })
		return envValue
	}

	return null
}

export async function setConfig(key: string, value: string): Promise<void> {
	const isSecret = SECRET_KEYS.has(key)

	await prisma.setting.upsert({
		where: { key },
		create: { key, value, isSecret },
		update: { value }
	})

	// Invalidate this key's cache
	cache.delete(key)
}

export async function getAllSettings(): Promise<Record<string, string>> {
	const result: Record<string, string> = {}

	// Load all DB settings
	const dbSettings = await prisma.setting.findMany()
	const dbMap = new Map(dbSettings.map((s) => [s.key, s]))

	for (const def of SETTING_DEFINITIONS) {
		const dbSetting = dbMap.get(def.key)
		if (dbSetting) {
			result[def.key] = def.isSecret ? MASKED_VALUE : dbSetting.value
		} else {
			// Check env var fallback
			const envKey = ENV_VAR_MAP[def.key]
			if (envKey && process.env[envKey]) {
				result[def.key] = def.isSecret ? MASKED_VALUE : process.env[envKey]!
			} else {
				result[def.key] = ''
			}
		}
	}

	return result
}

export async function getSettingMeta(): Promise<
	Record<string, { hasValue: boolean; source: 'db' | 'env' | 'none' }>
> {
	const result: Record<string, { hasValue: boolean; source: 'db' | 'env' | 'none' }> = {}

	const dbSettings = await prisma.setting.findMany()
	const dbMap = new Map(dbSettings.map((s) => [s.key, s]))

	for (const def of SETTING_DEFINITIONS) {
		const dbSetting = dbMap.get(def.key)
		if (dbSetting) {
			result[def.key] = { hasValue: true, source: 'db' }
		} else {
			const envKey = ENV_VAR_MAP[def.key]
			if (envKey && process.env[envKey]) {
				result[def.key] = { hasValue: true, source: 'env' }
			} else {
				result[def.key] = { hasValue: false, source: 'none' }
			}
		}
	}

	return result
}

export function invalidateConfigCache(): void {
	cache.clear()
}
