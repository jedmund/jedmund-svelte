import tippy, { type Props as TippyProps, type Instance } from 'tippy.js'

export interface TooltipOptions extends Partial<TippyProps> {
	content: string
	enabled?: boolean
}

export function tooltip(element: HTMLElement, options: TooltipOptions | string) {
	let instance: Instance | undefined

	function createTooltip(opts: TooltipOptions | string) {
		// Normalize options
		const config: TooltipOptions = typeof opts === 'string' ? { content: opts } : opts

		// Skip if disabled
		if (config.enabled === false) return

		// Create tippy instance with sensible defaults
		instance = tippy(element, {
			content: config.content,
			placement: config.placement || 'top',
			arrow: config.arrow !== false,
			animation: config.animation || 'scale',
			theme: config.theme || 'link-tooltip',
			delay: config.delay || [200, 0],
			duration: config.duration || [200, 150],
			offset: config.offset || [0, 10],
			...config
		})
	}

	// Initialize tooltip
	createTooltip(options)

	return {
		update(newOptions: TooltipOptions | string) {
			// Destroy existing instance
			if (instance) {
				instance.destroy()
				instance = undefined
			}

			// Create new instance with updated options
			createTooltip(newOptions)
		},
		destroy() {
			if (instance) {
				instance.destroy()
			}
		}
	}
}