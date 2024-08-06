import 'dotenv/config'
import { Redis } from 'ioredis'

const redis = new Redis({
	host: process.env.REDISHOST || 'localhost',
	port: parseInt(process.env.REDISPORT || '6379')
})

export default redis
