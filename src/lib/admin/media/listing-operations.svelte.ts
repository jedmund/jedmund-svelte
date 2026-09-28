import { onDestroy } from 'svelte'
import { invalidate } from '$app/navigation'
import { toast } from '$lib/stores/toast'
import { mediaRequest } from './requests'
import { runMediaBatch } from './bulk-operation'

export function createListingOperations(onFinished: () => void) {
	let selectedIds = $state(new Set<number>())
	let busy = $state(false)
	const controller = new AbortController()
	onDestroy(() => controller.abort())
	async function run(kind: 'delete' | 'photography', photography?: boolean) {
		if (busy || !selectedIds.size) return
		if (
			kind === 'delete' &&
			!confirm(
				`Delete ${selectedIds.size} media files and their content references? This cannot be undone.`
			)
		)
			return
		busy = true
		try {
			const result = await runMediaBatch(
				[...selectedIds],
				(id, signal) =>
					mediaRequest(kind === 'delete' ? '/api/media/bulk-delete' : `/api/media/${id}`, signal, {
						method: kind === 'delete' ? 'DELETE' : 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(
							kind === 'delete' ? { mediaIds: [id] } : { isPhotography: photography }
						)
					}),
				controller.signal
			)
			if (controller.signal.aborted) return
			selectedIds = new Set([...selectedIds].filter((id) => !result.succeeded.includes(id)))
			if (result.failed.length)
				toast.error(`${result.failed.length} files failed. Their selection is retained for retry.`)
			if (!selectedIds.size) onFinished()
			await invalidate('admin:media')
		} catch {
			if (!controller.signal.aborted)
				toast.error(
					'Changes saved, but refreshing the library failed. Reload to see the latest media.'
				)
		} finally {
			if (!controller.signal.aborted) busy = false
		}
	}
	return {
		get selectedIds() {
			return selectedIds
		},
		get busy() {
			return busy
		},
		toggle(id: number) {
			if (busy) return
			const next = new Set(selectedIds)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			selectedIds = next
		},
		selectAll(ids: number[]) {
			if (!busy) selectedIds = new Set([...selectedIds, ...ids])
		},
		clear() {
			if (!busy) selectedIds = new Set()
		},
		delete: () => run('delete'),
		markPhotography: () => run('photography', true),
		unmarkPhotography: () => run('photography', false)
	}
}
