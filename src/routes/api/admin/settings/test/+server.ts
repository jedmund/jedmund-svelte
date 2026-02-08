import type { RequestHandler } from './$types'
import { checkAdminAuth, jsonResponse, errorResponse } from '$lib/server/api-utils'
import { getConfig } from '$lib/server/config'

type ServiceName = 'lastfm' | 'cloudinary' | 'apple_music' | 'bluesky' | 'mastodon'

export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	let body: { service: ServiceName }
	try {
		body = await event.request.json()
	} catch {
		return errorResponse('Invalid JSON', 400)
	}

	const { service } = body
	if (!service) {
		return errorResponse('Missing service parameter', 400)
	}

	try {
		const result = await testService(service)
		return jsonResponse(result)
	} catch (error) {
		return jsonResponse({
			success: false,
			message: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}

async function testService(service: ServiceName): Promise<{ success: boolean; message: string }> {
	switch (service) {
		case 'lastfm':
			return testLastfm()
		case 'cloudinary':
			return testCloudinary()
		case 'apple_music':
			return testAppleMusic()
		case 'bluesky':
			return testBluesky()
		case 'mastodon':
			return testMastodon()
		default:
			return { success: false, message: `Unknown service: ${service}` }
	}
}

async function testLastfm(): Promise<{ success: boolean; message: string }> {
	const apiKey = await getConfig('lastfm.api_key')
	if (!apiKey) {
		return { success: false, message: 'API key not configured' }
	}

	try {
		const { LastClient } = await import('@musicorum/lastfm')
		const client = new LastClient(apiKey)
		await client.user.getInfo('jedmund')
		return { success: true, message: 'Connected to Last.fm' }
	} catch (error) {
		return { success: false, message: error instanceof Error ? error.message : 'Connection failed' }
	}
}

async function testCloudinary(): Promise<{ success: boolean; message: string }> {
	const cloudName = await getConfig('cloudinary.cloud_name')
	const apiKey = await getConfig('cloudinary.api_key')
	const apiSecret = await getConfig('cloudinary.api_secret')

	if (!cloudName || !apiKey || !apiSecret) {
		return { success: false, message: 'Cloudinary credentials not fully configured' }
	}

	try {
		const { v2: cloudinary } = await import('cloudinary')
		cloudinary.config({
			cloud_name: cloudName,
			api_key: apiKey,
			api_secret: apiSecret,
			secure: true
		})
		await cloudinary.api.resources({ max_results: 1 })
		return { success: true, message: 'Connected to Cloudinary' }
	} catch (error) {
		return { success: false, message: error instanceof Error ? error.message : 'Connection failed' }
	}
}

async function testAppleMusic(): Promise<{ success: boolean; message: string }> {
	try {
		const { generateAppleMusicToken } = await import('$lib/server/apple-music-auth')
		const token = await generateAppleMusicToken()

		const response = await fetch(
			'https://api.music.apple.com/v1/catalog/us/search?types=albums&term=test&limit=1',
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json'
				}
			}
		)

		if (!response.ok) {
			return { success: false, message: `Apple Music API returned ${response.status}` }
		}

		return { success: true, message: 'Connected to Apple Music' }
	} catch (error) {
		return { success: false, message: error instanceof Error ? error.message : 'Connection failed' }
	}
}

async function testBluesky(): Promise<{ success: boolean; message: string }> {
	const handle = await getConfig('bluesky.handle')
	const appPassword = await getConfig('bluesky.app_password')
	const did = await getConfig('bluesky.did')

	if (!appPassword || (!handle && !did)) {
		return { success: false, message: 'Bluesky credentials not configured' }
	}

	try {
		const { AtpAgent } = await import('@atproto/api')
		const testAgent = new AtpAgent({ service: 'https://bsky.social' })
		// Prefer DID for login — custom domain handles can fail handle resolution
		await testAgent.login({ identifier: did || handle!, password: appPassword })
		return { success: true, message: 'Connected to Bluesky' }
	} catch (error) {
		return { success: false, message: error instanceof Error ? error.message : 'Connection failed' }
	}
}

async function testMastodon(): Promise<{ success: boolean; message: string }> {
	const instance = await getConfig('mastodon.instance')
	const accessToken = await getConfig('mastodon.access_token')

	if (!instance || !accessToken) {
		return { success: false, message: 'Mastodon credentials not configured' }
	}

	try {
		const response = await fetch(`https://${instance}/api/v1/accounts/verify_credentials`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		})

		if (!response.ok) {
			return { success: false, message: `Mastodon API returned ${response.status}` }
		}

		return { success: true, message: 'Connected to Mastodon' }
	} catch (error) {
		return { success: false, message: error instanceof Error ? error.message : 'Connection failed' }
	}
}
