import { saveDescription, type DescriptionUpdate } from './media-requests'

export interface DescriptionState {
	saving: boolean
	error: string | null
}

interface Session {
	id: number
	pending?: string
	controller?: AbortController
	running?: Promise<void>
}

export function createDescriptionSession(options: {
	onState: (state: DescriptionState) => void
	onSaved: (update: DescriptionUpdate) => void
	save?: typeof saveDescription
}) {
	let active: Session | null = null
	let disposed = false
	const save = options.save ?? saveDescription

	function cancel() {
		active?.controller?.abort()
		active = null
	}

	async function drain(session: Session) {
		while (active === session && session.pending !== undefined) {
			const draft = session.pending
			session.pending = undefined
			session.controller = new AbortController()
			options.onState({ saving: true, error: null })
			try {
				const update = await save(session.id, draft, session.controller.signal)
				if (active !== session) return
				options.onSaved(update)
				options.onState({ saving: session.pending !== undefined, error: null })
			} catch (cause) {
				if (active !== session) return
				options.onState({
					saving: session.pending !== undefined,
					error:
						session.pending !== undefined
							? null
							: cause instanceof Error
								? cause.message
								: 'Failed to save description'
				})
			}
		}
	}

	return {
		select(id: number | null) {
			cancel()
			if (disposed) return
			active = id === null ? null : { id }
			options.onState({ saving: false, error: null })
		},
		save(description: string): Promise<void> {
			const session = active
			if (!session || disposed) return Promise.resolve()
			session.pending = description.trim()
			session.running ??= drain(session).finally(() => {
				session.running = undefined
			})
			return session.running
		},
		dispose() {
			disposed = true
			cancel()
		}
	}
}
