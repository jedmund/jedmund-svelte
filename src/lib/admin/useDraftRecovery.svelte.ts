import { loadDraft, clearDraft, timeAgo } from '$lib/admin/draftStore'

export function useDraftRecovery<TPayload>(options: {
	draftKey: string | null
	onRestore: (payload: TPayload) => void
	enabled?: boolean
}) {
	// Reactive state using $state rune
	let showPrompt = $state(false)
	let draftTimestamp = $state<number | null>(null)
	let timeTicker = $state(0)

	// Derived state for time display
	const draftTimeText = $derived.by(() =>
		draftTimestamp ? (timeTicker, timeAgo(draftTimestamp)) : null
	)

	// Auto-detect draft on mount using $effect
	$effect(() => {
		if (!options.draftKey || options.enabled === false) return

		const draft = loadDraft<TPayload>(options.draftKey)
		if (draft) {
			showPrompt = true
			draftTimestamp = draft.ts
		}
	})

	// Update time display every minute using $effect
	$effect(() => {
		if (!showPrompt) return

		const interval = setInterval(() => {
			timeTicker = timeTicker + 1
		}, 60000)

		return () => clearInterval(interval)
	})

	return {
		// State returned directly - reactive in Svelte 5
		showPrompt,
		draftTimeText,

		restore() {
			if (!options.draftKey) return
			const draft = loadDraft<TPayload>(options.draftKey)
			if (!draft) return

			options.onRestore(draft.payload)
			showPrompt = false
			clearDraft(options.draftKey)
		},

		dismiss() {
			if (!options.draftKey) return
			showPrompt = false
			clearDraft(options.draftKey)
		}
	}
}
