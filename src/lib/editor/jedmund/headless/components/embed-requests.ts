import { responseData } from '$lib/admin/response'
import type { EmbedMetadata } from './embed-metadata'

export async function loadEmbedMetadata(url: string, signal: AbortSignal) {
	const response = await fetch(`/api/og-metadata?url=${encodeURIComponent(url)}&refresh=true`, {
		signal
	})
	return responseData<EmbedMetadata>(response, 'Failed to fetch metadata')
}
