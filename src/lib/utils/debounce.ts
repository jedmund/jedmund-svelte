/**
 * Debounce utility
 *
 * Delays executing a function until after a specified delay has passed
 * since the last time it was invoked.
 */

export function debounce<Args extends unknown[]>(
	func: (...args: Args) => void | Promise<void>,
	delay: number
): (...args: Args) => void {
	let timeoutId: ReturnType<typeof setTimeout>

	return (...args: Args) => {
		clearTimeout(timeoutId)
		timeoutId = setTimeout(() => func(...args), delay)
	}
}
