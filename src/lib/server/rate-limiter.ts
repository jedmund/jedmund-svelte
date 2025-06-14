import redis from '../../routes/api/redis-client'

interface RateLimitState {
	failureCount: number
	lastFailureTime: number
	backoffUntil: number
}

export class ApiRateLimiter {
	private readonly maxRetries = 3
	private readonly baseBackoffMs = 1000 // Start with 1 second
	private readonly maxBackoffMs = 60000 // Max 1 minute
	private readonly resetTimeMs = 300000 // Reset after 5 minutes of success

	constructor(private readonly apiName: string) {}

	private getStateKey(identifier: string): string {
		return `ratelimit:${this.apiName}:${identifier}`
	}

	private getFailureKey(identifier: string): string {
		return `failure:${this.apiName}:${identifier}`
	}

	async shouldBlock(identifier: string): Promise<boolean> {
		// Check if this specific request has failed too many times
		const failureKey = this.getFailureKey(identifier)
		const failureCount = await redis.get(failureKey)

		if (failureCount && parseInt(failureCount) >= this.maxRetries) {
			console.log(`Blocking request for ${identifier} - too many failures`)
			return true
		}

		// Check if we're in backoff period
		const stateKey = this.getStateKey(this.apiName)
		const stateJson = await redis.get(stateKey)

		if (!stateJson) return false

		const state: RateLimitState = JSON.parse(stateJson)
		const now = Date.now()

		if (now < state.backoffUntil) {
			console.log(
				`API ${this.apiName} in backoff until ${new Date(state.backoffUntil).toISOString()}`
			)
			return true
		}

		// Reset state if enough time has passed
		if (now - state.lastFailureTime > this.resetTimeMs) {
			await redis.del(stateKey)
		}

		return false
	}

	async recordSuccess(identifier: string): Promise<void> {
		// Clear failure count for this specific identifier
		const failureKey = this.getFailureKey(identifier)
		await redis.del(failureKey)
	}

	async recordFailure(identifier: string, is429: boolean = false): Promise<void> {
		// Record failure for specific identifier
		const failureKey = this.getFailureKey(identifier)
		const currentCount = await redis.get(failureKey)
		const newCount = (currentCount ? parseInt(currentCount) : 0) + 1

		// Set with 24 hour expiry
		await redis.set(failureKey, newCount.toString(), 'EX', 86400)

		if (is429) {
			// Handle rate limiting with exponential backoff
			const stateKey = this.getStateKey(this.apiName)
			const stateJson = await redis.get(stateKey)

			let state: RateLimitState
			if (stateJson) {
				state = JSON.parse(stateJson)
				state.failureCount++
			} else {
				state = {
					failureCount: 1,
					lastFailureTime: Date.now(),
					backoffUntil: Date.now()
				}
			}

			// Calculate exponential backoff
			const backoffMs = Math.min(
				this.baseBackoffMs * Math.pow(2, state.failureCount - 1),
				this.maxBackoffMs
			)

			state.lastFailureTime = Date.now()
			state.backoffUntil = Date.now() + backoffMs

			// Store state with expiry
			await redis.set(stateKey, JSON.stringify(state), 'EX', 3600)

			console.log(`API ${this.apiName} rate limited - backing off for ${backoffMs}ms`)
		}
	}

	async cacheNotFound(identifier: string, ttl: number = 3600): Promise<void> {
		// Cache "not found" results to prevent repeated lookups
		const notFoundKey = `notfound:${this.apiName}:${identifier}`
		await redis.set(notFoundKey, '1', 'EX', ttl)
	}

	async isNotFoundCached(identifier: string): Promise<boolean> {
		const notFoundKey = `notfound:${this.apiName}:${identifier}`
		const cached = await redis.get(notFoundKey)
		return cached === '1'
	}
}
