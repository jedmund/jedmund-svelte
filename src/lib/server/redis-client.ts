import { Redis } from 'ioredis'
import { env } from '$lib/server/env'
import { logger } from '$lib/server/logger'

const redis = new Redis(env.redisUrl)

// Without a listener, ioredis 'error' events become uncaught exceptions and
// can crash the process on a dropped connection.
redis.on('error', (err) => {
	logger.error('Redis connection error', err as Error)
})

redis.on('connect', () => {
	logger.info('Redis connected')
})

export default redis
