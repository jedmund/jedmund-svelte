import { clearDebugCache, type CacheSelector } from './debug-requests'

interface CacheSessionOptions {
	pending: (keys: Set<string>) => void
	success: (message: string) => void
	error: (error: unknown) => void
	request?: typeof clearDebugCache
}

export function createDebugCacheSession(options: CacheSessionOptions) {
	const request = options.request ?? clearDebugCache
	const lifetime = new AbortController()
	const pending = new Set<string>()
	return {
		async clear(selector: CacheSelector, label: string): Promise<boolean> {
			const key = 'key' in selector ? selector.key : selector.pattern
			if (pending.has(key) || lifetime.signal.aborted) return false
			pending.add(key)
			options.pending(new Set(pending))
			try {
				const result = await request(selector, lifetime.signal)
				if (lifetime.signal.aborted) return false
				options.success(`${label}: ${result.deleted} keys deleted`)
				return true
			} catch (error) {
				if (!lifetime.signal.aborted) options.error(error)
				return false
			} finally {
				pending.delete(key)
				if (!lifetime.signal.aborted) options.pending(new Set(pending))
			}
		},
		dispose() {
			lifetime.abort()
			pending.clear()
		}
	}
}
