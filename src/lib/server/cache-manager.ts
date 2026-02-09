import redis from '../../routes/api/redis-client'
import { logger } from './logger'

export interface CacheConfig {
	prefix: string
	defaultTTL: number
	description: string
}

export class CacheManager {
	private static cacheTypes: Map<string, CacheConfig> = new Map([
		['lastfm-recent', { prefix: 'lastfm:recent:', defaultTTL: 30, description: 'Last.fm recent tracks' }],
		['lastfm-album', { prefix: 'lastfm:albuminfo:', defaultTTL: 3600, description: 'Last.fm album info' }],
		['apple-album', { prefix: 'apple:album:', defaultTTL: 86400, description: 'Apple Music album data' }],
		['apple-notfound', { prefix: 'notfound:apple-music:', defaultTTL: 3600, description: 'Apple Music not found records' }],
		['apple-failure', { prefix: 'failure:apple-music:', defaultTTL: 86400, description: 'Apple Music API failures' }],
		['apple-ratelimit', { prefix: 'ratelimit:apple-music:', defaultTTL: 3600, description: 'Apple Music rate limit state' }],
		['bluesky-session', { prefix: 'bluesky:session:', defaultTTL: 3600, description: 'Bluesky authenticated session' }],
		['syndication-replies', { prefix: 'syndication:replies:', defaultTTL: 300, description: 'Social replies' }]
	])

	/**
	 * Get a value from cache
	 */
	static async get(type: string, key: string): Promise<string | null> {
		const config = this.cacheTypes.get(type)
		if (!config) {
			logger.error(`Unknown cache type: ${type}`)
			return null
		}

		const fullKey = `${config.prefix}${key}`
		return await redis.get(fullKey)
	}

	/**
	 * Set a value in cache
	 */
	static async set(type: string, key: string, value: string, ttl?: number): Promise<void> {
		const config = this.cacheTypes.get(type)
		if (!config) {
			logger.error(`Unknown cache type: ${type}`)
			return
		}

		const fullKey = `${config.prefix}${key}`
		const expiry = ttl || config.defaultTTL
		
		await redis.set(fullKey, value, 'EX', expiry)
		logger.music('debug', `Cached ${type} for key: ${key} (TTL: ${expiry}s)`)
	}

	/**
	 * Delete a specific cache entry
	 */
	static async delete(type: string, key: string): Promise<boolean> {
		const config = this.cacheTypes.get(type)
		if (!config) {
			logger.error(`Unknown cache type: ${type}`)
			return false
		}

		const fullKey = `${config.prefix}${key}`
		const deleted = await redis.del(fullKey)
		return deleted > 0
	}

	/**
	 * Clear all entries for a specific cache type
	 */
	static async clearType(type: string): Promise<number> {
		const config = this.cacheTypes.get(type)
		if (!config) {
			logger.error(`Unknown cache type: ${type}`)
			return 0
		}

		const pattern = `${config.prefix}*`
		const keys = await redis.keys(pattern)
		
		if (keys.length === 0) return 0
		
		const deleted = await redis.del(...keys)
		logger.music('info', `Cleared ${deleted} entries from ${type} cache`)
		return deleted
	}

	/**
	 * Clear all entries matching a pattern within a cache type
	 */
	static async clearPattern(type: string, pattern: string): Promise<number> {
		const config = this.cacheTypes.get(type)
		if (!config) {
			logger.error(`Unknown cache type: ${type}`)
			return 0
		}

		const searchPattern = `${config.prefix}*${pattern}*`
		const keys = await redis.keys(searchPattern)
		
		if (keys.length === 0) return 0
		
		const deleted = await redis.del(...keys)
		logger.music('info', `Cleared ${deleted} entries matching "${pattern}" from ${type} cache`)
		return deleted
	}

	/**
	 * Clear all caches for a specific album
	 */
	static async clearAlbum(artist: string, album: string): Promise<number> {
		const albumKey = `${artist}:${album}`
		let totalDeleted = 0

		// Clear all cache types that might contain this album
		for (const [type] of this.cacheTypes) {
			if (type.includes('album') || type.includes('notfound')) {
				const deleted = await this.clearPattern(type, albumKey)
				totalDeleted += deleted
			}
		}

		logger.music('info', `Cleared ${totalDeleted} cache entries for album "${album}" by "${artist}"`)
		return totalDeleted
	}

	/**
	 * Get all cache types and their info
	 */
	static getCacheTypes(): Array<{ type: string; config: CacheConfig }> {
		return Array.from(this.cacheTypes.entries()).map(([type, config]) => ({ type, config }))
	}

	/**
	 * Get cache statistics
	 */
	static async getStats(): Promise<Array<{ type: string; count: number; description: string }>> {
		const stats = []
		
		for (const [type, config] of this.cacheTypes) {
			const keys = await redis.keys(`${config.prefix}*`)
			stats.push({
				type,
				count: keys.length,
				description: config.description
			})
		}
		
		return stats
	}
}

// Export convenience functions for common operations
export const cache = {
	lastfm: {
		getRecent: (username: string) => CacheManager.get('lastfm-recent', username),
		setRecent: (username: string, data: string) => CacheManager.set('lastfm-recent', username, data),
		getAlbum: (artist: string, album: string) => CacheManager.get('lastfm-album', `${artist}:${album}`),
		setAlbum: (artist: string, album: string, data: string) => CacheManager.set('lastfm-album', `${artist}:${album}`, data)
	},
	apple: {
		getAlbum: (artist: string, album: string) => CacheManager.get('apple-album', `${artist}:${album}`),
		setAlbum: (artist: string, album: string, data: string, ttl?: number) => CacheManager.set('apple-album', `${artist}:${album}`, data, ttl),
		isNotFound: (artist: string, album: string) => CacheManager.get('apple-notfound', `${artist}:${album}`),
		markNotFound: (artist: string, album: string, ttl?: number) => CacheManager.set('apple-notfound', `${artist}:${album}`, '1', ttl)
	}
}
