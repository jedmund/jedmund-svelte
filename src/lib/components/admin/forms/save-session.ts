/** Explicit saves and autosave share one queue, including the first create request. */
export function createSaveQueue() {
	let tail: Promise<unknown> = Promise.resolve()
	function run<T>(save: () => Promise<T>): Promise<T> {
		const result = tail.then(save)
		tail = result.catch(() => {})
		return result
	}
	return {
		run,
		// Recheck eligibility when the request reaches the front of the queue. A publish
		// or teardown may have happened while a background save was waiting.
		runIf(eligible: () => boolean, save: () => Promise<void>): Promise<void> {
			return run(async () => {
				if (eligible()) await save()
			})
		}
	}
}

/** Adopt canonical server values only for fields untouched since submission. */
export function acknowledgeField<T>(current: T, submitted: T, canonical: T): T {
	return JSON.stringify(current) === JSON.stringify(submitted) ? canonical : current
}
