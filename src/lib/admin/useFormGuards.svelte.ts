import { beforeNavigate } from '$app/navigation'
import { toast } from '$lib/stores/toast'
import type { AutoSaveStore } from '$lib/admin/autoSave.svelte'

export function useFormGuards(autoSave: AutoSaveStore<unknown, unknown> | null) {
	if (!autoSave) return // No guards needed for create mode

	// Navigation guard: flush autosave before route change
	beforeNavigate(async (_navigation) => {
		// If already saved, allow navigation immediately
		if (autoSave.status === 'saved') return

		// Otherwise flush pending changes
		try {
			await autoSave.flush()
		} catch (error) {
			console.error('Autosave flush failed:', error)
			toast.error('Failed to save changes')
		}
	})

	// Warn before closing browser tab/window if unsaved changes
	$effect(() => {
		function handleBeforeUnload(event: BeforeUnloadEvent) {
			if (autoSave!.status !== 'saved') {
				event.preventDefault()
				event.returnValue = ''
			}
		}

		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => window.removeEventListener('beforeunload', handleBeforeUnload)
	})

	// Cmd/Ctrl+S keyboard shortcut for immediate save
	$effect(() => {
		function handleKeydown(event: KeyboardEvent) {
			const key = event.key.toLowerCase()
			const isModifier = event.metaKey || event.ctrlKey

			if (isModifier && key === 's') {
				event.preventDefault()
				autoSave!.flush().catch((error) => {
					console.error('Autosave flush failed:', error)
					toast.error('Failed to save changes')
				})
			}
		}

		document.addEventListener('keydown', handleKeydown)
		return () => document.removeEventListener('keydown', handleKeydown)
	})

	// No return value - purely side effects
}
