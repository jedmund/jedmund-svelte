import { Redis } from 'ioredis'
import { env } from '$lib/server/env'

const redis = new Redis(env.redisUrl)

export default redis
