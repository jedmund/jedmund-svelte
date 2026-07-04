import { randomUUID } from 'node:crypto'
import { prisma } from '$lib/server/database'
import { logger } from '$lib/server/logger'
import { syndicateContent } from '$lib/server/syndication/syndicate'
import redis from '../../routes/api/redis-client'

const TICK_INTERVAL_MS = 60_000
const STARTUP_TICK_DELAY_MS = 5_000
const LOCK_KEY = 'locks:publish-tick'
const LOCK_TTL_MS = 55_000

// Delete the lock only if we still own it
const UNLOCK_SCRIPT =
	'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end'

export async function runScheduledPublishTick(): Promise<void> {
	const lockId = randomUUID()

	let acquired: string | null
	try {
		acquired = await redis.set(LOCK_KEY, lockId, 'PX', LOCK_TTL_MS, 'NX')
	} catch (error) {
		logger.error('Publish tick: could not reach Redis for lock', error as Error)
		return
	}
	if (!acquired) {
		logger.debug('Publish tick: lock held elsewhere, skipping')
		return
	}

	try {
		const due = await prisma.post.findMany({
			where: { status: 'scheduled', publishedAt: { lte: new Date() } },
			select: { id: true, title: true, slug: true }
		})

		for (const post of due) {
			// Compare-and-set so concurrent ticks can't double-publish
			const { count } = await prisma.post.updateMany({
				where: { id: post.id, status: 'scheduled' },
				data: { status: 'published' }
			})
			if (count !== 1) continue

			logger.info('Scheduled post published', { id: post.id, slug: post.slug })
			syndicateContent('post', post.id).catch((err) =>
				logger.error('Auto-syndication failed for scheduled post', err as Error)
			)
		}
	} catch (error) {
		logger.error('Publish tick failed', error as Error)
	} finally {
		try {
			await redis.eval(UNLOCK_SCRIPT, 1, LOCK_KEY, lockId)
		} catch {
			// lock expires on its own TTL
		}
	}
}

// Survives dev-server module reloads
const globals = globalThis as typeof globalThis & { __publishSchedulerStarted?: boolean }

export function startScheduler(): void {
	if (globals.__publishSchedulerStarted) return
	globals.__publishSchedulerStarted = true

	// Catch posts that came due while the process was down
	setTimeout(() => void runScheduledPublishTick(), STARTUP_TICK_DELAY_MS).unref()
	setInterval(() => void runScheduledPublishTick(), TICK_INTERVAL_MS).unref()

	logger.info('Scheduled-publish ticker started')
}
