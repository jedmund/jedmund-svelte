import { getAppleMusicHeaders } from './apple-music-auth'
import { ApiRateLimiter } from './rate-limiter'
import { createAppleMusicRequest } from './apple-music-request'

export const rateLimiter = new ApiRateLimiter('apple-music')
export const makeAppleMusicRequest = createAppleMusicRequest({
	headers: getAppleMusicHeaders,
	limiter: rateLimiter
})
