/**
 * Format a date as a relative time string (e.g., "2 minutes ago")
 * @param date - The date to format
 * @returns A human-readable relative time string
 */
export function formatTimeAgo(date: Date | string): string {
	const now = new Date()
	const past = new Date(date)
	const seconds = Math.floor((now.getTime() - past.getTime()) / 1000)

	if (seconds < 10) return 'just now'
	if (seconds < 60) return `${seconds} seconds ago`

	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`

	const hours = Math.floor(minutes / 60)
	if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`

	// For saves older than 24 hours, show formatted date
	return past.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	})
}
