// Notion/Coda-style draft auto-save: debounced, single-in-flight, with a small status state machine.
// Intentionally minimal — no localStorage fallback, no draft recovery, no offline retry queue.
//
// Design note: the visible state ('idle' | 'unsaved' | …) is a $derived computed from a few
// primitive flags. The debounce $effect only writes non-reactive timer handles, never the state
// it also reads — that combination is what produces feedback loops with caller-side trackers.

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

	let isSaving = $state(false)
	let savedFlash = $state(false)
	let saveError = $state<'failed' | 'conflict' | null>(null)

	let timer: ReturnType<typeof setTimeout> | null = null
	let savedTimer: ReturnType<typeof setTimeout> | null = null
	let inflight: Promise<void> | null = null
	let pending = false

	const state: AutoSaveState = $derived.by(() => {
		if (saveError === 'conflict') return 'conflict'
		if (saveError === 'failed') return 'failed'
		if (isSaving) return 'saving'
		if (savedFlash) return 'saved'
		if (opts.enabled() && opts.isDirty()) return 'unsaved'
		return 'idle'
	})

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
		if (!opts.enabled() || saveError === 'conflict') return
		isSaving = true
		savedFlash = false
		try {
			await opts.save()
			isSaving = false
			savedFlash = true
			savedTimer = setTimeout(() => {
				savedFlash = false
				savedTimer = null
			}, savedVisibleMs)
		} catch (err) {
			isSaving = false
			const status = (err as { status?: number } | null)?.status
			saveError = status === 409 ? 'conflict' : 'failed'
			throw err
		}
	}

	async function performSave(): Promise<void> {
		if (inflight) {
			pending = true
			try {
				await inflight
			} catch {
				// swallow — original caller already saw it
			}
			if (!pending) return
			pending = false
			if (!opts.isDirty() || !opts.enabled() || saveError === 'conflict') return
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
			if (pending && opts.isDirty() && opts.enabled() && saveError !== 'conflict') {
				pending = false
				await performSave()
			} else {
				pending = false
			}
		}
	}

	// Debounce timer driver. Only reads enabled/isDirty/saveError; never writes state-related $state
	// inside this effect — those writes happen from runSave (an async call out of band).
	$effect(() => {
		if (!opts.enabled() || saveError === 'conflict') {
			clearTimer()
			return
		}
		if (!opts.isDirty()) {
			clearTimer()
			return
		}
		clearTimer()
		timer = setTimeout(() => {
			timer = null
			if (!opts.enabled() || !opts.isDirty() || saveError === 'conflict') return
			void performSave()
		}, debounceMs)
	})

	async function flush(): Promise<void> {
		clearTimer()
		if (!opts.enabled() || saveError === 'conflict') return
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
