import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { getConfig } from './config'

let cachedToken: string | null = null
let tokenExpiry: Date | null = null

export async function generateAppleMusicToken(): Promise<string> {
	// Check if we have a valid cached token
	if (cachedToken && tokenExpiry && tokenExpiry > new Date()) {
		console.log('Using cached Apple Music token')
		return cachedToken
	}

	const teamId = await getConfig('apple_music.team_id')
	const keyId = await getConfig('apple_music.key_id')
	const privateKeyContent = await getConfig('apple_music.private_key')

	console.log('Generating new Apple Music token...')
	console.log('Team ID:', teamId)
	console.log('Key ID:', keyId)

	// Read the private key - support both DB/env content and file path fallback
	let privateKey: string
	if (privateKeyContent) {
		privateKey = privateKeyContent
	} else if (process.env.APPLE_MUSIC_PRIVATE_KEY_PATH) {
		// File path fallback (for local development)
		try {
			privateKey = readFileSync(process.env.APPLE_MUSIC_PRIVATE_KEY_PATH, 'utf8')
			console.log('Successfully read private key from file')
		} catch (error) {
			console.error('Failed to read private key file:', error)
			throw error
		}
	} else {
		throw new Error('Apple Music private key not configured')
	}

	// Token expires in 6 months (max allowed by Apple)
	const expiresIn = 15552000 // 180 days in seconds

	// Generate the token
	const token = jwt.sign({}, privateKey, {
		algorithm: 'ES256',
		expiresIn,
		issuer: teamId!,
		header: {
			alg: 'ES256',
			kid: keyId!
		}
	})

	// Cache the token
	cachedToken = token
	tokenExpiry = new Date(Date.now() + expiresIn * 1000)

	return token
}

export async function getAppleMusicHeaders(): Promise<Record<string, string>> {
	return {
		Authorization: `Bearer ${await generateAppleMusicToken()}`,
		'Music-User-Token': '', // Will be needed for user-specific features
		Accept: 'application/json',
		'Content-Type': 'application/json'
	}
}
