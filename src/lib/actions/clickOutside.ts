/**
 * Svelte action that dispatches a 'clickoutside' event when the user clicks outside the element.
 *
 * @example
 * ```svelte
 * <div use:clickOutside on:clickoutside={() => isOpen = false}>
 *   Dropdown content
 * </div>
 * ```
 *
 * @example With options
 * ```svelte
 * <div use:clickOutside={{ enabled: isOpen }} on:clickoutside={handleClose}>
 *   Dropdown content
 * </div>
 * ```
 */

export interface ClickOutsideOptions {
	/** Whether the action is enabled. Defaults to true. */
	enabled?: boolean
	/** Optional callback to execute on click outside. */
	callback?: () => void
}

export function clickOutside(
	element: HTMLElement,
	options: ClickOutsideOptions | (() => void) = {}
) {
	let enabled = true
	let callback: (() => void) | undefined

	// Normalize options
	if (typeof options === 'function') {
		callback = options
	} else {
		enabled = options.enabled !== false
		callback = options.callback
	}

	function handleClick(event: MouseEvent) {
		if (!enabled) return

		const target = event.target as Node

		// Check if click is outside the element
		if (element && !element.contains(target)) {
			// Dispatch custom event
			element.dispatchEvent(
				new CustomEvent('clickoutside', {
					detail: { target }
				})
			)

			// Call callback if provided
			if (callback) {
				callback()
			}
		}
	}

	let timer: ReturnType<typeof setTimeout> | undefined
	let destroyed = false
	function attach() {
		clearTimeout(timer)
		timer = setTimeout(() => {
			if (!destroyed && enabled) document.addEventListener('click', handleClick, true)
		}, 0)
	}
	attach()

	return {
		update(newOptions: ClickOutsideOptions | (() => void)) {
			clearTimeout(timer)
			document.removeEventListener('click', handleClick, true)
			if (typeof newOptions === 'function') {
				enabled = true
				callback = newOptions
			} else {
				enabled = newOptions.enabled !== false
				callback = newOptions.callback
			}
			if (enabled) attach()
		},
		destroy() {
			destroyed = true
			clearTimeout(timer)
			document.removeEventListener('click', handleClick, true)
		}
	}
}
