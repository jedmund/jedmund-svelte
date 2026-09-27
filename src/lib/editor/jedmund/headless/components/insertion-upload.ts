import type { Media } from '@prisma/client'
import { responseData } from '$lib/admin/response'

export async function uploadInsertionMedia(
	file: File,
	contentType: string,
	albumId: number | undefined,
	signal: AbortSignal
): Promise<Media> {
	const formData = new FormData()
	formData.append('file', file)
	formData.append('type', contentType)

	if (albumId) {
		formData.append('albumId', albumId.toString())
	}

	const response = await fetch('/api/media/upload', {
		signal: signal,
		method: 'POST',
		body: formData,
		credentials: 'same-origin'
	})

	return responseData<Media>(response, 'Failed to upload file')
}
