import type { Media } from '@prisma/client'
import { mediaRequest } from './requests'

export interface UploadEntry {
	id: number
	file: File
	status: 'waiting' | 'uploading' | 'complete' | 'failed'
	error?: string
	media?: Media
}
export interface UploadQueueState {
	entries: UploadEntry[]
	running: boolean
	errors: string[]
}
export const emptyUploadQueue = (): UploadQueueState => ({
	entries: [],
	running: false,
	errors: []
})
export async function uploadMedia(file: File, signal: AbortSignal) {
	const body = new FormData()
	body.append('file', file)
	return mediaRequest<Media>('/api/media/upload', signal, { method: 'POST', body })
}

/** File identity, not filename, owns progress. Completed entries never upload again on retry. */
export function createUploadQueue(options: {
	onChange: (state: UploadQueueState) => void
	upload?: typeof uploadMedia
}) {
	let state = emptyUploadQueue()
	let sequence = 0
	const controller = new AbortController()
	const publish = () =>
		options.onChange({ ...state, entries: state.entries.map((entry) => ({ ...entry })) })
	return {
		add(files: File[]) {
			if (state.running || controller.signal.aborted) return
			for (const file of files) {
				if (state.entries.some((entry) => entry.file === file)) continue
				if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
					state.errors = [...state.errors, `${file.name}: unsupported file type`]
					continue
				}
				state.entries.push({ id: ++sequence, file, status: 'waiting' })
			}
			publish()
		},
		remove(file: File) {
			if (state.running) return
			state.entries = state.entries.filter((entry) => entry.file !== file)
			publish()
		},
		clear() {
			if (state.running) return
			state = emptyUploadQueue()
			publish()
		},
		async run() {
			if (state.running || controller.signal.aborted) return false
			state.running = true
			state.errors = []
			publish()
			try {
				for (const entry of state.entries) {
					if (controller.signal.aborted) return false
					if (entry.status === 'complete') continue
					entry.status = 'uploading'
					entry.error = undefined
					publish()
					try {
						const media = await (options.upload ?? uploadMedia)(entry.file, controller.signal)
						if (controller.signal.aborted) return false
						entry.status = 'complete'
						entry.media = media
					} catch (cause) {
						if (controller.signal.aborted) return false
						entry.status = 'failed'
						entry.error = cause instanceof Error ? cause.message : 'Upload failed'
						state.errors.push(`${entry.file.name}: ${entry.error}`)
					}
					publish()
				}
				return (
					state.entries.length > 0 && state.entries.every((entry) => entry.status === 'complete')
				)
			} finally {
				if (!controller.signal.aborted) {
					state.running = false
					publish()
				}
			}
		},
		dispose: () => controller.abort()
	}
}
