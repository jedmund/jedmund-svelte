import { onDestroy } from 'svelte'
import { createAutoSave, type AutoSaveOptions } from './auto-save'

/** Svelte owns observation and teardown; the tested engine owns asynchronous work. */
export function useAutoSave(options: AutoSaveOptions) {
	let revision = $state(0)
	const controller = createAutoSave(options, () => revision++)
	$effect(() => {
		options.enabled()
		options.isDirty()
		controller.schedule()
	})
	onDestroy(() => controller.dispose())
	return {
		get state() {
			void revision
			return controller.state
		},
		flush: controller.flush
	}
}
