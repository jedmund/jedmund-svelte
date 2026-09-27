import type { Media } from '@prisma/client'
import { uploadImage, validateImage } from './media-requests'

export type UploadState =
	| { status: 'idle'; progress: 0; error: string | null }
	| { status: 'uploading'; progress: number; error: null }

interface Session {
	controller: AbortController
	interval?: ReturnType<typeof setInterval>
	timeout?: ReturnType<typeof setTimeout>
	finishDelay?: () => void
}

export function createUploadSession(options: {
	onState: (state: UploadState) => void
	onComplete: (media: Media) => void
	upload?: typeof uploadImage
}) {
	let active: Session | null = null
	let disposed = false
	const upload = options.upload ?? uploadImage
	const idle = (error: string | null = null) =>
		options.onState({ status: 'idle', progress: 0, error })
	function cleanup(session: Session) {
		clearInterval(session.interval)
		clearTimeout(session.timeout)
		session.finishDelay?.()
	}
	function cancel() {
		if (!active) return
		const session = active
		active = null
		session.controller.abort()
		cleanup(session)
		if (!disposed) idle()
	}

	return {
		cancel,
		dispose() {
			disposed = true
			cancel()
		},
		async start(file: File, maxFileSize: number, description: string) {
			if (disposed || active) return
			const validation = validateImage(file, maxFileSize)
			if (validation) {
				idle(validation)
				return
			}
			const session: Session = { controller: new AbortController() }
			active = session
			let progress = 0
			let error: string | null = null
			options.onState({ status: 'uploading', progress, error: null })
			// Estimated activity feedback, capped until the server confirms completion.
			session.interval = setInterval(() => {
				progress = Math.min(90, progress + Math.random() * 10)
				options.onState({ status: 'uploading', progress, error: null })
			}, 100)
			try {
				const media = await upload(file, description, session.controller.signal)
				if (active !== session) return
				clearInterval(session.interval)
				options.onState({ status: 'uploading', progress: 100, error: null })
				await new Promise<void>((resolve) => {
					session.finishDelay = resolve
					session.timeout = setTimeout(resolve, 500)
				})
				if (active === session) options.onComplete(media)
			} catch (cause) {
				error = cause instanceof Error ? cause.message : 'Upload failed'
			} finally {
				cleanup(session)
				if (active === session) {
					active = null
					if (!disposed) idle(error)
				}
			}
		}
	}
}
