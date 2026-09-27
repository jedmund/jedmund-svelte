export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString)
	const now = new Date()
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

	if (diffInSeconds < 60) return 'just now'

	const minutes = Math.floor(diffInSeconds / 60)
	if (diffInSeconds < 3600) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`

	const hours = Math.floor(diffInSeconds / 3600)
	if (diffInSeconds < 86400) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

	const days = Math.floor(diffInSeconds / 86400)
	if (diffInSeconds < 2592000) return `${days} ${days === 1 ? 'day' : 'days'} ago`

	const months = Math.floor(diffInSeconds / 2592000)
	if (diffInSeconds < 31536000) return `${months} ${months === 1 ? 'month' : 'months'} ago`

	const years = Math.floor(diffInSeconds / 31536000)
	return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

export function formatScheduledDate(dateString: string): string {
	return new Date(dateString).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	})
}

export function formatDate(dateString: string): string {
	const date = new Date(dateString)
	const now = new Date()
	const diffTime = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	if (diffDays === 0) {
		return 'today'
	} else if (diffDays === 1) {
		return 'yesterday'
	} else if (diffDays < 7) {
		return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
	} else {
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		})
	}
}
