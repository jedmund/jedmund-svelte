/** Closing is deferred until the library refresh completes for the same queue revision. */
export function createUploadCompletion() {
	let revision = 0
	let timer: ReturnType<typeof setTimeout> | undefined
	function cancel() {
		revision++
		clearTimeout(timer)
	}
	return {
		cancel,
		schedule(refresh: () => void | Promise<void>, close: () => void, failed: () => void) {
			cancel()
			const current = revision
			timer = setTimeout(async () => {
				try {
					await refresh()
					if (current === revision) close()
				} catch {
					if (current === revision) failed()
				}
			}, 1500)
		}
	}
}
