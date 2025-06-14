import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { env } from '$env/dynamic/private'

let cachedToken: string | null = null
let tokenExpiry: Date | null = null

export function generateAppleMusicToken(): string {
	// Check if we have a valid cached token
	if (cachedToken && tokenExpiry && tokenExpiry > new Date()) {
		console.log('Using cached Apple Music token')
		return cachedToken
	}

	console.log('Generating new Apple Music token...')
	console.log('Team ID:', env.APPLE_MUSIC_TEAM_ID)
	console.log('Key ID:', env.APPLE_MUSIC_KEY_ID)
	console.log('Key path configured:', !!env.APPLE_MUSIC_PRIVATE_KEY_PATH)

	// Read the private key - support both file path and direct content
	let privateKey: string
	if (env.APPLE_MUSIC_PRIVATE_KEY) {
		// Direct key content from environment variable
		privateKey = env.APPLE_MUSIC_PRIVATE_KEY
	} else if (env.APPLE_MUSIC_PRIVATE_KEY_PATH) {
		// File path (for local development)
		try {
			privateKey = readFileSync(env.APPLE_MUSIC_PRIVATE_KEY_PATH, 'utf8')
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
		issuer: env.APPLE_MUSIC_TEAM_ID!,
		header: {
			alg: 'ES256',
			kid: env.APPLE_MUSIC_KEY_ID!
		}
	})

	// Cache the token
	cachedToken = token
	tokenExpiry = new Date(Date.now() + expiresIn * 1000)

	return token
}

export function getAppleMusicHeaders(): Record<string, string> {
	return {
		Authorization: `Bearer ${generateAppleMusicToken()}`,
		'Music-User-Token': '', // Will be needed for user-specific features
		Accept: 'application/json',
		'Content-Type': 'application/json'
	}
}
