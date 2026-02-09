import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { getConfig } from './config'
import { logger } from './logger'

let cachedToken: string | null = null
let tokenExpiry: Date | null = null

export async function generateAppleMusicToken(): Promise<string> {
	if (cachedToken && tokenExpiry && tokenExpiry > new Date()) {
		return cachedToken
	}

	const teamId = await getConfig('apple_music.team_id')
	const keyId = await getConfig('apple_music.key_id')
	const privateKeyContent = await getConfig('apple_music.private_key')

	let privateKey: string
	if (privateKeyContent) {
		privateKey = privateKeyContent
	} else if (process.env.APPLE_MUSIC_PRIVATE_KEY_PATH) {
		try {
			privateKey = readFileSync(process.env.APPLE_MUSIC_PRIVATE_KEY_PATH, 'utf8')
		} catch (error) {
			logger.error('Failed to read private key file', error as Error)
			throw error
		}
	} else {
		throw new Error('Apple Music private key not configured')
	}

	const expiresIn = 15552000

	const token = jwt.sign({}, privateKey, {
		algorithm: 'ES256',
		expiresIn,
		issuer: teamId!,
		header: {
			alg: 'ES256',
			kid: keyId!
		}
	})

	cachedToken = token
	tokenExpiry = new Date(Date.now() + expiresIn * 1000)

	return token
}

export async function getAppleMusicHeaders(): Promise<Record<string, string>> {
	return {
		Authorization: `Bearer ${await generateAppleMusicToken()}`,
		Accept: 'application/json',
		'Content-Type': 'application/json'
	}
}
