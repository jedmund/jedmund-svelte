import { api } from '../api'

export interface SyndicationRecord {
	id: number
	platform: string
	status: string
	externalUrl: string | null
	errorMessage: string | null
	createdAt: string
}

export interface SyndicationTarget {
	contentType: string
	contentId: number
}

export const syndicationRequests = {
	async status(target: SyndicationTarget, signal: AbortSignal) {
		const params = new URLSearchParams({
			contentType: target.contentType,
			contentId: String(target.contentId)
		})
		const data = await api.get<{ syndications: SyndicationRecord[] }>(
			`/api/syndication/status?${params}`,
			{ signal }
		)
		return data.syndications
	},
	async trigger(target: SyndicationTarget, signal: AbortSignal) {
		const data = await api.post<{ syndications: SyndicationRecord[] }>(
			'/api/syndication/trigger',
			target,
			{ signal }
		)
		return data.syndications
	},
	save(
		target: SyndicationTarget,
		platform: string,
		externalUrl: string,
		id: number | undefined,
		signal: AbortSignal
	) {
		return id === undefined
			? api.post<SyndicationRecord>(
					'/api/syndication/status',
					{ ...target, platform, externalUrl },
					{ signal }
				)
			: api.patch<SyndicationRecord>(`/api/syndication/${id}`, { externalUrl }, { signal })
	}
}
