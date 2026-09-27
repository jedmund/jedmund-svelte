/** Runs all independent items, preserving success even when another item fails. */
export async function runMediaBatch<T>(
	items: T[],
	operation: (item: T, signal: AbortSignal) => Promise<unknown>,
	signal: AbortSignal
) {
	const succeeded: T[] = []
	const failed: Array<{ item: T; message: string }> = []
	for (const item of items) {
		if (signal.aborted) break
		try {
			await operation(item, signal)
			succeeded.push(item)
		} catch (cause) {
			if (signal.aborted) break
			failed.push({ item, message: cause instanceof Error ? cause.message : 'Operation failed' })
		}
	}
	return { succeeded, failed }
}
