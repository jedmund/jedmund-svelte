import { beforeNavigate, goto } from '$app/navigation'
import { onDestroy } from 'svelte'
import { createFormNavigation } from './form-navigation'

interface FormLifecycleOptions {
	isDirty: () => boolean
	canAutoSave: () => boolean
	flush: () => Promise<void>
	save: () => Promise<void>
}

export function useFormLifecycle(options: FormLifecycleOptions) {
	let showUnsavedChangesModal = $state(false)
	const navigation = createFormNavigation({
		...options,
		goto,
		prompt: (open) => {
			showUnsavedChangesModal = open
		}
	})
	beforeNavigate((event) => {
		if (!event.to || event.type === 'leave' || !options.isDirty()) return
		const url = event.to.url.pathname + event.to.url.search + event.to.url.hash
		if (navigation.allows(url)) return
		event.cancel()
		void navigation.request(url)
	})
	$effect(() => {
		function keydown(event: KeyboardEvent) {
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
			event.preventDefault()
			// Form persistence reports errors; listeners also consume rejected background work.
			const save = options.canAutoSave() ? options.flush() : options.save()
			save.catch(() => {})
		}
		function blur() {
			if (options.canAutoSave()) options.flush().catch(() => {})
		}
		function beforeunload(event: BeforeUnloadEvent) {
			if (!options.isDirty()) return
			event.preventDefault()
			event.returnValue = ''
		}
		document.addEventListener('keydown', keydown)
		window.addEventListener('blur', blur)
		window.addEventListener('beforeunload', beforeunload)
		return () => {
			document.removeEventListener('keydown', keydown)
			window.removeEventListener('blur', blur)
			window.removeEventListener('beforeunload', beforeunload)
		}
	})
	onDestroy(navigation.dispose)
	return {
		get showUnsavedChangesModal() {
			return showUnsavedChangesModal
		},
		handleContinueEditing: navigation.continueEditing,
		handleLeaveWithoutSaving: navigation.leave,
		navigateAfterDelete: navigation.navigateAfterDelete
	}
}
