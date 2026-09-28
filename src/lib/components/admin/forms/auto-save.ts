export type AutoSaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'failed' | 'conflict'

export interface AutoSaveOptions {
	enabled: () => boolean
	isDirty: () => boolean
	save: () => Promise<void>
	debounceMs?: number
	savedVisibleMs?: number
}

/** Owns the single request, debounce and saved-status timers for one mounted form. */
export function createAutoSave(options: AutoSaveOptions, changed: () => void = () => {}) {
	let saving = false
	let saved = false
	let failure: unknown
	let hasFailure = false
	let disposed = false
	let inflight: Promise<void> | null = null
	let timer: ReturnType<typeof setTimeout> | undefined
	let savedTimer: ReturnType<typeof setTimeout> | undefined

	function conflict() {
		return (
			failure !== null &&
			typeof failure === 'object' &&
			'status' in failure &&
			failure.status === 409
		)
	}

	function clearTimers() {
		clearTimeout(timer)
		clearTimeout(savedTimer)
		timer = savedTimer = undefined
	}

	async function saveUntilClean() {
		if (disposed) {
			inflight = null
			return
		}
		saving = true
		saved = false
		hasFailure = false
		changed()
		try {
			do {
				await options.save()
				// A save acknowledges its submitted snapshot. Keep edits made during that request dirty
				// and drain them before resolving flush (especially when navigation is waiting).
			} while (!disposed && options.enabled() && options.isDirty())
			if (disposed) return
			saved = true
			savedTimer = setTimeout(() => {
				saved = false
				savedTimer = undefined
				changed()
			}, options.savedVisibleMs ?? 2000)
		} catch (error) {
			failure = error
			hasFailure = true
			throw error
		} finally {
			saving = false
			inflight = null
			if (!disposed) changed()
		}
	}

	function flush(): Promise<void> {
		clearTimeout(timer)
		timer = undefined
		if (disposed) return Promise.resolve()
		if (hasFailure && conflict()) return Promise.reject(failure)
		if (inflight) return inflight
		if (!options.enabled() || !options.isDirty()) return Promise.resolve()
		clearTimeout(savedTimer)
		savedTimer = undefined
		inflight = Promise.resolve().then(saveUntilClean)
		return inflight
	}

	return {
		get state(): AutoSaveState {
			if (hasFailure) return conflict() ? 'conflict' : 'failed'
			if (saving) return 'saving'
			if (options.enabled() && options.isDirty()) return 'unsaved'
			return saved ? 'saved' : 'idle'
		},
		flush,
		schedule() {
			clearTimeout(timer)
			if (!saving && !options.isDirty() && !conflict()) {
				hasFailure = false
				failure = undefined
			}
			if (disposed || hasFailure || saving || !options.enabled() || !options.isDirty()) return
			timer = setTimeout(() => {
				timer = undefined
				// Background saves report failure through state. Explicit flush callers receive rejection.
				flush().catch(() => {})
			}, options.debounceMs ?? 1500)
		},
		dispose() {
			disposed = true
			clearTimers()
		}
	}
}

export function formatSaveStatus(state: AutoSaveState): string {
	switch (state) {
		case 'saving':
			return 'Saving…'
		case 'unsaved':
			return 'Unsaved'
		case 'failed':
			return 'Save failed'
		case 'conflict':
			return 'Conflict — reload'
		default:
			return 'Saved'
	}
}
