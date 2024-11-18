import 'dotenv/config'
import { Redis } from 'ioredis'

console.log('Redis client')
console.log(process.env.REDIS_URL)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export default redis
