interface NavigationOptions {
	isDirty: () => boolean
	canAutoSave: () => boolean
	flush: () => Promise<void>
	goto: (url: string) => Promise<void>
	prompt: (open: boolean) => void
}

/** Navigation never acknowledges edits; a failed navigation must leave the form protected. */
export function createFormNavigation(options: NavigationOptions) {
	let pendingUrl: string | null = null
	let allowedUrl: string | null = null
	let generation = 0
	let disposed = false

	async function navigate(url: string) {
		allowedUrl = url
		try {
			await options.goto(url)
		} finally {
			allowedUrl = null
		}
	}

	return {
		allows(url: string) {
			return allowedUrl === url
		},
		async request(url: string) {
			const request = ++generation
			pendingUrl = url
			try {
				if (!options.canAutoSave()) {
					options.prompt(true)
					return
				}
				await options.flush()
				if (disposed || request !== generation) return
				if (options.isDirty()) {
					options.prompt(true)
					return
				}
				await navigate(url)
			} catch {
				if (!disposed && request === generation) options.prompt(true)
			}
		},
		continueEditing() {
			generation++
			pendingUrl = null
			options.prompt(false)
		},
		async leave() {
			if (!pendingUrl) return
			try {
				await navigate(pendingUrl)
				options.prompt(false)
			} catch {
				if (!disposed) options.prompt(true)
			}
		},
		async navigateAfterDelete(url: string) {
			if (disposed) return
			generation++
			pendingUrl = url
			try {
				await navigate(url)
			} catch {
				if (!disposed) options.prompt(true)
			}
		},
		dispose() {
			disposed = true
			generation++
		}
	}
}
