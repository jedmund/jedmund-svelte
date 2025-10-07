import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createAutoSaveController } from '../src/lib/admin/autoSave'

describe('createAutoSaveController', () => {
	beforeEach(() => {
		if (typeof navigator === 'undefined') {
			// @ts-expect-error add minimal navigator shim for tests
			global.navigator = { onLine: true }
		}
	})

	it('skips save when payload matches primed baseline', async () => {
		let value = 0
		let saveCalls = 0

		const controller = createAutoSaveController<{ value: number }>({
			debounceMs: 5,
			getPayload: () => ({ value }),
			save: async () => {
				saveCalls += 1
				return { value }
			}
		})

		controller.prime({ value })
		controller.schedule()

		await wait(15)
		assert.equal(saveCalls, 0)

		await controller.flush()
		assert.equal(saveCalls, 0)

		controller.destroy()
	})

	it('saves when payload changes and returns to idle after success', async () => {
		let value = 0
		let updatedAt = 0
		let saveCalls = 0
		const statuses: string[] = []

		const controller = createAutoSaveController<{ value: number; updatedAt: number }, { updatedAt: number }>({
			debounceMs: 5,
			idleResetMs: 10,
			getPayload: () => ({ value, updatedAt }),
			save: async (payload) => {
				saveCalls += 1
				return { updatedAt: payload.updatedAt + 1 }
			},
			onSaved: (response, { prime }) => {
				updatedAt = response.updatedAt
				prime({ value, updatedAt })
			}
		})

		const unsubscribe = controller.status.subscribe((status) => {
			statuses.push(status)
		})

		controller.prime({ value, updatedAt })

		value = 1
		controller.schedule()

		await wait(15)
		assert.equal(saveCalls, 1)
		assert.ok(statuses.includes('saving'))
		assert.ok(statuses.includes('saved'))

		await wait(20)
		assert.equal(statuses.at(-1), 'idle')

		unsubscribe()
		controller.destroy()
	})

	it('cancels pending work on destroy', async () => {
		let saveCalls = 0
		const controller = createAutoSaveController<{ foo: string }>({
			debounceMs: 20,
			getPayload: () => ({ foo: 'bar' }),
			save: async () => {
				saveCalls += 1
			}
		})

		controller.schedule()
		controller.destroy()

		await wait(30)
		assert.equal(saveCalls, 0)
	})
})

function wait(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
