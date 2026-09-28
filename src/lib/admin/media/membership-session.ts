/** Successful mutations advance the baseline immediately, so retries only send remaining work. */
export function createMembershipSession(
	initial: Iterable<number>,
	change: (id: number, selected: boolean, signal: AbortSignal) => Promise<unknown>
) {
	const committed = new Set(initial)
	const controller = new AbortController()
	let running = false
	return {
		async save(selected: Iterable<number>) {
			if (running || controller.signal.aborted) return false
			running = true
			const target = new Set(selected)
			try {
				for (const id of new Set([...committed, ...target])) {
					if (controller.signal.aborted) return false
					if (committed.has(id) === target.has(id)) continue
					await change(id, target.has(id), controller.signal)
					if (target.has(id)) committed.add(id)
					else committed.delete(id)
				}
				return !controller.signal.aborted
			} finally {
				running = false
			}
		},
		close: () => controller.abort()
	}
}
