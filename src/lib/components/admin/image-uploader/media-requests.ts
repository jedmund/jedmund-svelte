import type { Media } from '@prisma/client'

export type DescriptionUpdate = Pick<Media, 'id' | 'description' | 'updatedAt'>

export function validateImage(file: File, maxFileSize: number): string | null {
	if (!file.type.startsWith('image/')) return 'Please select an image file'
	if (file.size > maxFileSize * 1024 * 1024) return `File size must be less than ${maxFileSize}MB`
	return null
}

async function responseData<T>(response: Response, fallback: string): Promise<T> {
	const data: unknown = await response.json().catch(() => null)
	if (!response.ok) {
		const error = data && typeof data === 'object' && 'error' in data ? data.error : null
		const message = error && typeof error === 'object' && 'message' in error ? error.message : null
		throw new Error(typeof message === 'string' && message ? message : fallback)
	}
	if (!data || typeof data !== 'object') throw new Error(fallback)
	// These endpoints return the existing media wire contract; dates remain serialized in the UI.
	return data as T
}

export async function uploadImage(
	file: File,
	description: string,
	signal: AbortSignal
): Promise<Media> {
	const body = new FormData()
	body.append('file', file)
	if (description.trim()) body.append('description', description.trim())
	return responseData<Media>(
		await fetch('/api/media/upload', {
			method: 'POST',
			body,
			signal,
			credentials: 'same-origin'
		}),
		'Upload failed'
	)
}

export async function saveDescription(
	id: number,
	description: string,
	signal: AbortSignal
): Promise<DescriptionUpdate> {
	return responseData<DescriptionUpdate>(
		await fetch(`/api/media/${id}/metadata`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ description: description.trim() }),
			signal,
			credentials: 'same-origin'
		}),
		'Failed to save description'
	)
}
