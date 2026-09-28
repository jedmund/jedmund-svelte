import type { Media } from '@prisma/client'
import { api } from './api'
import type { composerPayload } from './composer-submission'

export function publishComposerPost(
	payload: ReturnType<typeof composerPayload>,
	signal: AbortSignal
) {
	return api.post('/api/posts', payload, { signal })
}

export function uploadComposerPhoto(file: File, signal: AbortSignal) {
	const body = new FormData()
	body.append('file', file)
	body.append('type', 'image')
	return api.post<Media>('/api/media/upload', body, { signal })
}
