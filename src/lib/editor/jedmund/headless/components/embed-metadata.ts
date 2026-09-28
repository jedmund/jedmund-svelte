export type MetadataStatus = 'idle' | 'loading' | 'error'
export interface EmbedMetadata {
	title?: string
	description?: string
	image?: string
	favicon?: string
	siteName?: string
}

export function createEmbedMetadataSession(options: {
	load: (url: string, signal: AbortSignal) => Promise<EmbedMetadata>
	apply: (url: string, metadata: EmbedMetadata) => void
	status: (status: MetadataStatus) => void
}) {
	let generation = 0
	let abort: AbortController | undefined
	let disposed = false
	return {
		async refresh(url: string) {
			if (!url || disposed) return
			abort?.abort()
			abort = new AbortController()
			const current = ++generation
			options.status('loading')
			try {
				const metadata = await options.load(url, abort.signal)
				if (current !== generation || disposed) return
				options.apply(url, metadata)
				options.status('idle')
			} catch {
				if (current === generation && !disposed) options.status('error')
			}
		},
		dispose() {
			disposed = true
			generation++
			abort?.abort()
		}
	}
}
