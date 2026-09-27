import { onMount, onDestroy } from 'svelte'
import {
	fetchMediaStats,
	regenerate,
	type MediaStats,
	type RegenerationResults,
	type ReanalysisResults
} from './maintenance-requests'

export function createRegenerationController() {
	const lifetime = new AbortController()
	let running = $state<'colors' | 'thumbnails' | 'reanalyze' | null>(null)
	let mediaStats = $state<MediaStats | null>(null)
	let colorExtractionResults = $state<RegenerationResults | null>(null)
	let thumbnailResults = $state<RegenerationResults | null>(null)
	let reanalysisResults = $state<ReanalysisResults | null>(null)
	let error = $state<string | null>(null)
	let showResultsModal = $state(false)
	let statsVersion = 0
	onDestroy(() => lifetime.abort())
	onMount(() => {
		void refreshStats()
	})
	async function refreshStats() {
		const version = ++statsVersion
		try {
			const result = await fetchMediaStats(lifetime.signal)
			if (!lifetime.signal.aborted && version === statsVersion) mediaStats = result
		} catch (cause) {
			if (!lifetime.signal.aborted && version === statsVersion)
				error = cause instanceof Error ? cause.message : 'Failed to refresh stats'
		}
	}
	function clearResults() {
		colorExtractionResults = null
		thumbnailResults = null
		reanalysisResults = null
	}
	async function run(kind: NonNullable<typeof running>) {
		if (running || lifetime.signal.aborted) return
		running = kind
		error = null
		clearResults()
		statsVersion++
		try {
			const result = await regenerate(kind, lifetime.signal)
			if (lifetime.signal.aborted) return
			if (kind === 'reanalyze') reanalysisResults = result as ReanalysisResults
			else if (kind === 'colors') colorExtractionResults = result as RegenerationResults
			else thumbnailResults = result as RegenerationResults
			showResultsModal = true
			await refreshStats()
		} catch (cause) {
			if (!lifetime.signal.aborted)
				error = cause instanceof Error ? cause.message : 'Regeneration failed'
		} finally {
			if (!lifetime.signal.aborted) running = null
		}
	}
	return {
		get extractingColors() {
			return running === 'colors'
		},
		get regeneratingThumbnails() {
			return running === 'thumbnails'
		},
		get reanalyzingColors() {
			return running === 'reanalyze'
		},
		get mediaStats() {
			return mediaStats
		},
		get colorExtractionResults() {
			return colorExtractionResults
		},
		get thumbnailResults() {
			return thumbnailResults
		},
		get reanalysisResults() {
			return reanalysisResults
		},
		get error() {
			return error
		},
		get showResultsModal() {
			return showResultsModal
		},
		set showResultsModal(value) {
			showResultsModal = value
		},
		clearResults,
		extractColors: () => run('colors'),
		regenerateThumbnails: () => run('thumbnails'),
		reanalyzeColors: () => run('reanalyze')
	}
}
