/**
 * Debounce utility
 *
 * Delays executing a function until after a specified delay has passed
 * since the last time it was invoked.
 */

export function debounce<T extends (...args: any[]) => void>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId)
		timeoutId = setTimeout(() => func(...args), delay)
	}
}
