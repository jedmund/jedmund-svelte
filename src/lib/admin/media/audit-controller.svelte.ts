import { onMount, onDestroy } from 'svelte'
import {
	fetchAudit,
	deleteOrphans,
	cleanupReferences,
	type AuditData,
	type DeleteResults,
	type CleanupResults
} from './maintenance-requests'

export function createAuditController() {
	let loading = $state(true)
	let deleting = $state(false)
	let cleaningUp = $state(false)
	let auditData = $state<AuditData | null>(null)
	let error = $state<string | null>(null)
	let selectedFiles = $state(new Set<string>())
	let showDeleteModal = $state(false)
	let showCleanupModal = $state(false)
	let deleteResults = $state<DeleteResults | null>(null)
	let cleanupResults = $state<CleanupResults | null>(null)
	const lifetime = new AbortController()
	let read: AbortController | undefined
	let refreshTimer: ReturnType<typeof setTimeout> | undefined
	const allSelected = $derived(
		!!auditData?.orphanedFiles.length &&
			auditData.orphanedFiles.slice(0, 20).every((file) => selectedFiles.has(file.publicId))
	)
	const hasSelection = $derived(selectedFiles.size > 0)
	const selectedSize = $derived(
		auditData?.orphanedFiles
			.filter((file) => selectedFiles.has(file.publicId))
			.reduce((sum, file) => sum + file.size, 0) || 0
	)
	onDestroy(() => {
		lifetime.abort()
		read?.abort()
		clearTimeout(refreshTimer)
	})
	onMount(() => {
		void runAudit()
	})
	async function runAudit(retainSelection = false) {
		if (deleting || cleaningUp || lifetime.signal.aborted) return
		clearTimeout(refreshTimer)
		read?.abort()
		const request = (read = new AbortController())
		loading = true
		error = null
		if (!retainSelection) selectedFiles = new Set()
		try {
			const data = await fetchAudit(request.signal)
			if (request.signal.aborted) return
			auditData = data
		} catch (cause) {
			if (!request.signal.aborted)
				error = cause instanceof Error ? cause.message : 'Failed to load audit'
		} finally {
			if (!request.signal.aborted) loading = false
		}
	}
	function refresh() {
		clearTimeout(refreshTimer)
		refreshTimer = setTimeout(() => {
			void runAudit(true)
		}, 2000)
	}
	async function deleteSelected(dryRun = true) {
		if (!hasSelection || deleting || cleaningUp) return
		read?.abort()
		loading = false
		if (!dryRun) showDeleteModal = false
		deleting = true
		deleteResults = null
		error = null
		try {
			const result = await deleteOrphans([...selectedFiles], dryRun, lifetime.signal)
			if (lifetime.signal.aborted) return
			if (!dryRun) {
				deleteResults = result.results
				selectedFiles = new Set(result.results.failed)
				refresh()
			}
		} catch (cause) {
			if (!lifetime.signal.aborted)
				error = cause instanceof Error ? cause.message : 'Failed to delete files'
		} finally {
			if (!lifetime.signal.aborted) deleting = false
		}
	}
	async function cleanupBrokenReferences() {
		if (!auditData?.missingReferences.length || deleting || cleaningUp) return
		read?.abort()
		loading = false
		showCleanupModal = false
		cleaningUp = true
		cleanupResults = null
		error = null
		try {
			const result = await cleanupReferences(auditData.missingReferences, lifetime.signal)
			if (lifetime.signal.aborted) return
			cleanupResults = result.results
			refresh()
		} catch (cause) {
			if (!lifetime.signal.aborted)
				error = cause instanceof Error ? cause.message : 'Failed to clean up references'
		} finally {
			if (!lifetime.signal.aborted) cleaningUp = false
		}
	}
	return {
		get loading() {
			return loading
		},
		get deleting() {
			return deleting
		},
		get cleaningUp() {
			return cleaningUp
		},
		get auditData() {
			return auditData
		},
		get error() {
			return error
		},
		get selectedFiles() {
			return selectedFiles
		},
		get allSelected() {
			return allSelected
		},
		get hasSelection() {
			return hasSelection
		},
		get selectedSize() {
			return selectedSize
		},
		get deleteResults() {
			return deleteResults
		},
		get cleanupResults() {
			return cleanupResults
		},
		get showDeleteModal() {
			return showDeleteModal
		},
		set showDeleteModal(value) {
			showDeleteModal = value
		},
		get showCleanupModal() {
			return showCleanupModal
		},
		set showCleanupModal(value) {
			showCleanupModal = value
		},
		runAudit,
		deleteSelected,
		cleanupBrokenReferences,
		toggleSelectAll() {
			if (deleting || cleaningUp) return
			selectedFiles = allSelected
				? new Set()
				: new Set(auditData?.orphanedFiles.slice(0, 20).map((file) => file.publicId))
		},
		toggleFile(id: string) {
			if (deleting || cleaningUp) return
			const next = new Set(selectedFiles)
			if (next.has(id)) next.delete(id)
			else if (next.size < 20) next.add(id)
			selectedFiles = next
		}
	}
}
