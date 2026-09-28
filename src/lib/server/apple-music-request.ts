interface RequestDependencies {
	headers: () => Promise<Record<string, string>>
	limiter: {
		shouldBlock(identifier: string): Promise<boolean>
		recordSuccess(identifier: string): Promise<void>
		recordFailure(identifier: string, throttled: boolean): Promise<void>
	}
	fetch?: typeof fetch
	now?: () => number
	wait?: (milliseconds: number) => Promise<void>
}

// A transport instance reserves request slots synchronously. Parallel album enrichment
// cannot wake multiple requests into the same rate-limit slot.
export function createAppleMusicRequest(dependencies: RequestDependencies) {
	const fetcher = dependencies.fetch ?? fetch
	const now = dependencies.now ?? Date.now
	const wait = dependencies.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
	let nextRequestAt = 0
	return async function request<T>(endpoint: string, identifier?: string): Promise<T> {
		if (identifier && (await dependencies.limiter.shouldBlock(identifier))) {
			throw new Error('Request blocked due to rate limiting')
		}
		const headers = await dependencies.headers()
		const current = now()
		const scheduled = Math.max(current, nextRequestAt)
		nextRequestAt = scheduled + 200
		if (scheduled > current) await wait(scheduled - current)
		const response = await fetcher(`https://api.music.apple.com/v1${endpoint}`, { headers })
		if (!response.ok) {
			if (identifier) await dependencies.limiter.recordFailure(identifier, response.status === 429)
			throw new Error(`HTTP ${response.status}: ${response.statusText} - ${await response.text()}`)
		}
		const data: unknown = await response.json()
		if (!isResponseEnvelope(data)) throw new Error('Malformed Apple Music response')
		if (identifier) await dependencies.limiter.recordSuccess(identifier)
		// The provider supplies endpoint-specific resource types; validate the envelope here.
		return data as T
	}
}

function isResponseEnvelope(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	const response = value as Record<string, unknown>
	return (
		Array.isArray(response.data) ||
		(!!response.results && typeof response.results === 'object' && !Array.isArray(response.results))
	)
}
