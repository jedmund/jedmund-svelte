// Notion/Coda-style draft auto-save: debounced, single-in-flight, with a small status state machine.
// Intentionally minimal — no localStorage fallback, no draft recovery, no offline retry queue.

export type AutoSaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'failed' | 'conflict'

export interface AutoSaveOptions {
	enabled: () => boolean
	isDirty: () => boolean
	save: () => Promise<void>
	debounceMs?: number
	savedVisibleMs?: number
}

export interface AutoSave {
	readonly state: AutoSaveState
	flush(): Promise<void>
}

const DEFAULT_DEBOUNCE_MS = 1500
const DEFAULT_SAVED_VISIBLE_MS = 2000

export function useAutoSave(opts: AutoSaveOptions): AutoSave {
	const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS
	const savedVisibleMs = opts.savedVisibleMs ?? DEFAULT_SAVED_VISIBLE_MS

	let state = $state<AutoSaveState>('idle')
	let timer: ReturnType<typeof setTimeout> | null = null
	let savedTimer: ReturnType<typeof setTimeout> | null = null
	let inflight: Promise<void> | null = null
	// True if a change came in while a save was running — schedule one follow-up after.
	let pending = false

	function clearTimer() {
		if (timer !== null) {
			clearTimeout(timer)
			timer = null
		}
	}

	function clearSavedTimer() {
		if (savedTimer !== null) {
			clearTimeout(savedTimer)
			savedTimer = null
		}
	}

	async function runSave(): Promise<void> {
		clearTimer()
		clearSavedTimer()
		if (!opts.enabled()) return
		if (state === 'conflict') return
		state = 'saving'
		try {
			await opts.save()
			// If the user kept editing during the save, we'll fire another save below
			// but still flash 'saved' briefly to confirm progress.
			state = 'saved'
			savedTimer = setTimeout(() => {
				if (state === 'saved') state = opts.isDirty() ? 'unsaved' : 'idle'
				savedTimer = null
			}, savedVisibleMs)
		} catch (err) {
			const status = (err as { status?: number } | null)?.status
			state = status === 409 ? 'conflict' : 'failed'
			throw err
		}
	}

	async function performSave(): Promise<void> {
		if (inflight) {
			// One save running; coalesce: schedule one follow-up after it lands.
			pending = true
			try {
				await inflight
			} catch {
				// swallow — the original caller already saw the error
			}
			if (!pending) return
			pending = false
			if (!opts.isDirty() || !opts.enabled() || state === 'conflict') return
			return performSave()
		}
		inflight = (async () => {
			try {
				await runSave()
			} finally {
				inflight = null
			}
		})()
		try {
			await inflight
		} finally {
			// If changes piled up during the save, fire one more pass.
			if (pending && opts.isDirty() && opts.enabled() && state !== 'conflict') {
				pending = false
				await performSave()
			} else {
				pending = false
			}
		}
	}

	// Debounce: bump state to 'unsaved' immediately on dirty, but wait debounceMs before saving.
	$effect(() => {
		if (!opts.enabled()) {
			clearTimer()
			if (state === 'saving') return
			state = 'idle'
			return
		}
		if (state === 'conflict') return
		if (!opts.isDirty()) return

		// Visible "unsaved" cue while debounce window is active (unless mid-save).
		if (state !== 'saving') state = 'unsaved'

		clearTimer()
		timer = setTimeout(() => {
			timer = null
			if (!opts.enabled() || !opts.isDirty() || state === 'conflict') return
			void performSave()
		}, debounceMs)
	})

	async function flush(): Promise<void> {
		clearTimer()
		if (!opts.enabled() || state === 'conflict') return
		if (!opts.isDirty() && !inflight) return
		await performSave()
	}

	return {
		get state() {
			return state
		},
		flush
	}
}
