import { getConfig } from '$lib/server/config'

export const GET = async () => {
	const did = await getConfig('bluesky.did')
	if (!did) {
		return new Response('Not configured', { status: 404 })
	}
	return new Response(did, {
		headers: { 'Content-Type': 'text/plain' }
	})
}
