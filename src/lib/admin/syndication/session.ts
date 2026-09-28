import type { SyndicationRecord, SyndicationTarget, syndicationRequests } from './requests'

export interface SyndicationState {
	records: SyndicationRecord[]
	loading: boolean
	triggering: boolean
	saving: boolean
	error: string
}

/** One target owns one request lifetime. Mutations invalidate earlier status reads. */
export function createSyndicationSession(
	transport: typeof syndicationRequests,
	changed: (state: SyndicationState) => void
) {
	let state: SyndicationState = {
		records: [],
		loading: false,
		triggering: false,
		saving: false,
		error: ''
	}
	let target: SyndicationTarget | undefined
	let controller = new AbortController()
	let revision = 0
	const update = (patch: Partial<SyndicationState>) => {
		state = { ...state, ...patch }
		changed(state)
	}

	async function run(
		kind: 'loading' | 'triggering' | 'saving',
		operation: (signal: AbortSignal) => Promise<SyndicationRecord[]>
	) {
		if (!target || state.triggering || state.saving) return false
		const current = ++revision
		controller.abort()
		controller = new AbortController()
		update({ loading: false, [kind]: true, error: '' })
		try {
			const records = await operation(controller.signal)
			if (current !== revision) return false
			update({ records })
			return true
		} catch (error) {
			if (current === revision)
				update({ error: error instanceof Error ? error.message : 'Syndication request failed' })
			return false
		} finally {
			if (current === revision) update({ [kind]: false })
		}
	}

	return {
		setTarget(next?: SyndicationTarget) {
			revision++
			controller.abort()
			target = next
			update({ records: [], loading: false, triggering: false, saving: false, error: '' })
			if (next) void run('loading', (signal) => transport.status(next, signal))
		},
		trigger() {
			const current = target
			return current
				? run('triggering', (signal) => transport.trigger(current, signal))
				: Promise.resolve(false)
		},
		save(platform: string, url: string, id?: number) {
			const current = target
			if (!current || !url.trim()) return Promise.resolve(false)
			return run('saving', async (signal) => {
				const record = await transport.save(current, platform, url, id, signal)
				return [...state.records.filter((item) => item.platform !== record.platform), record]
			})
		},
		dispose() {
			revision++
			target = undefined
			controller.abort()
		}
	}
}
