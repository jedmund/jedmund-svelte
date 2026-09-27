import { generateGardenSlug } from './garden-form'
import { createSaveQueue, acknowledgeField } from './save-session'
import { formatSaveStatus } from '$lib/components/admin/forms/auto-save'
import { useFormLifecycle } from '$lib/components/admin/forms/useFormLifecycle.svelte'
import { untrack, onDestroy } from 'svelte'
import { replaceState } from '$app/navigation'
import { api } from '$lib/admin/api'
import { useAutoSave } from '$lib/components/admin/forms/useAutoSave.svelte'
import { toast } from '$lib/stores/toast'
import {
	SEARCH_CONFIGS,
	createSearchFn,
	getCreatorLabel,
	getExternalUrl
} from '$lib/constants/garden'
import type { GardenCategory } from '$lib/constants/garden'
import type { TypeaheadSelection } from '$lib/types/garden'
import type { GardenItem } from '@prisma/client'
import type { JSONContent } from '@tiptap/core'
interface Props {
	item?: GardenItem | null
	mode: 'create' | 'edit'
}

export function createGardenForm(options: Props) {
	const { item: initialItem = null, mode: initialMode }: Props = options

	// Capture the starting record once; later saves must not reset unsaved fields.
	const seed = untrack(() => ({ item: initialItem, mode: initialMode }))

	// Local state so we can transition create → edit in place after first save.
	let item = $state(seed.item)
	let mode = $state<'create' | 'edit'>(seed.mode)

	// Form state
	let category = $state<GardenCategory>((seed.item?.category as GardenCategory) ?? 'books')
	let title = $state(seed.item?.title ?? '')
	let slug = $state(seed.item?.slug ?? '')
	let creator = $state(seed.item?.creator ?? '')
	let imageUrl = $state(seed.item?.imageUrl ?? '')
	let url = $state(seed.item?.url ?? '')
	let sourceId = $state(seed.item?.sourceId ?? '')
	let metadata = $state<Record<string, unknown> | null>(
		(seed.item?.metadata as Record<string, unknown>) ?? null
	)
	let summary = $state(seed.item?.summary ?? '')
	let date = $state(seed.item?.date ? new Date(seed.item.date).toISOString().slice(0, 10) : '')
	let rating = $state<number | null>(seed.item?.rating ?? null)
	let isCurrent = $state(seed.item?.isCurrent ?? false)
	let isFavorite = $state(seed.item?.isFavorite ?? false)
	let showInUniverse = $state(seed.item?.showInUniverse ?? false)
	let status = $state<'draft' | 'published'>(
		(seed.item?.status as 'draft' | 'published') ?? 'draft'
	)
	let note = $state<JSONContent>(
		(seed.item?.note as JSONContent) ?? { type: 'doc', content: [{ type: 'paragraph' }] }
	)

	// Selection state: 'empty' = show typeahead, 'selected' = show card, 'changing' = typeahead with pre-filled title
	let selectionState = $state<'empty' | 'selected' | 'changing'>(
		seed.mode === 'edit' && seed.item?.title ? 'selected' : 'empty'
	)

	// Year for display in the selection card (not stored separately, derived from metadata or item)
	let selectedYear = $state<string | null>(null)

	// Component refs
	let typeaheadRef:
		| ReturnType<typeof import('$lib/components/admin/Typeahead.svelte').default>
		| undefined = $state()

	// UI state
	let isSaving = $state(false)
	let activeTab = $state('details')
	let showDeleteConfirmation = $state(false)
	let autoSlug = $state(seed.mode === 'create')

	const viewUrl = $derived(
		status === 'published' && slug ? `/garden/${category}/${slug}` : undefined
	)

	const isSearchable = $derived(!!SEARCH_CONFIGS[category])

	// Snapshot dirty tracking — same pattern as PostForm. The $derived recomputes only when one of the
	// referenced fields changes, and crucially does NOT write any reactive state, so it can't form a
	// feedback loop with the auto-save effect that reads it.
	function snapshot(targetStatus = status): string {
		return JSON.stringify([
			category,
			title,
			slug,
			creator,
			imageUrl,
			url,
			sourceId,
			metadata,
			summary,
			date,
			rating,
			isCurrent,
			isFavorite,
			showInUniverse,
			targetStatus,
			note
		])
	}

	let savedSnapshot = $state<string>(snapshot())
	const isDirty = $derived(snapshot() !== savedSnapshot)

	// Auto-save runs only for drafts and only after the title is non-empty (the server requires a title,
	// and we don't want autosave to fire prematurely on an otherwise blank form).
	const autoSave = useAutoSave({
		enabled: () => status === 'draft' && title.trim() !== '',
		isDirty: () => isDirty,
		save: () => handleSave(undefined, { silent: true })
	})

	const autoSaveLabel = $derived(formatSaveStatus(autoSave.state))

	const creatorLabel = $derived(getCreatorLabel(category))

	const searchFn = $derived.by(() => {
		const config = SEARCH_CONFIGS[category]
		return config ? createSearchFn(config) : null
	})

	const searchPlaceholder = $derived(SEARCH_CONFIGS[category]?.placeholder ?? 'Enter title')

	const searchEmptyText = $derived(SEARCH_CONFIGS[category]?.emptyText ?? 'No results found')

	function handleSearchSelect(selection: TypeaheadSelection) {
		title = selection.result.name
		if (selection.result.creator) {
			creator = selection.result.creator
		}
		if (selection.result.image) {
			imageUrl = selection.result.image
		}
		sourceId = selection.result.sourceId ?? ''
		metadata = selection.result.metadata ?? null
		summary = selection.result.summary ?? ''
		selectedYear = selection.result.year ?? null

		// Generate URL from sourceId
		if (sourceId) {
			const externalUrl = getExternalUrl(category, sourceId)
			if (externalUrl) {
				url = externalUrl
			}
		}

		if (autoSlug) {
			slug = generateGardenSlug(selection.result.name)
		}

		selectionState = 'selected'
	}

	let focusFrame: number | undefined
	function handleChangeSelection() {
		selectionState = 'changing'
		// Wait for typeahead to render, then focus and search
		if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
		focusFrame = requestAnimationFrame(() => {
			focusFrame = undefined
			typeaheadRef?.focusAndSearch()
		})
	}

	function handleCategoryChange(newCategory: GardenCategory) {
		category = newCategory

		// Clear search-derived data but preserve user-typed title
		creator = ''
		imageUrl = ''
		url = ''
		sourceId = ''
		metadata = null
		summary = ''
		selectedYear = null
		if (autoSlug) {
			slug = generateGardenSlug(title)
		}

		selectionState = 'empty'
	}

	const tabOptions = [
		{ value: 'details', label: 'Details' },
		{ value: 'thoughts', label: 'Thoughts' }
	]

	function handleTitleInput() {
		if (autoSlug) {
			slug = generateGardenSlug(title)
		}
	}

	const lifecycle = useFormLifecycle({
		isDirty: () => isDirty,
		canAutoSave: () => status === 'draft' && title.trim() !== '' && autoSave.state !== 'conflict',
		flush: () => autoSave.flush(),
		save: () => handleSave(status)
	})

	let disposed = false
	onDestroy(() => {
		disposed = true
		if (focusFrame !== undefined) cancelAnimationFrame(focusFrame)
	})

	const saveQueue = createSaveQueue()

	async function handleSave(newStatus?: string, { silent = false } = {}) {
		return saveQueue.runIf(
			() => !disposed && (!silent || status === 'draft'),
			async () => {
				const saveStatus = (newStatus as 'draft' | 'published') || status

				if (!title.trim()) {
					if (!silent) toast.error('Title is required')
					return
				}

				// Build the snapshot that represents what we're about to submit (not what's currently in the
				// form, which may diverge from saveStatus if the user clicked Publish on a draft). Don't apply
				// `status = saveStatus` locally yet — if the request fails we'd be left showing a status the
				// server hasn't actually accepted.
				const submittingSnapshot = snapshot(saveStatus)

				isSaving = true
				const loadingToastId = silent
					? null
					: toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} item...`)

				try {
					const payload = {
						category,
						title: title.trim(),
						slug: slug.trim() || undefined,
						creator: creator.trim() || undefined,
						imageUrl: imageUrl.trim() || undefined,
						url: url.trim() || undefined,
						sourceId: sourceId.trim() || undefined,
						metadata: metadata ?? undefined,
						summary: summary.trim() || undefined,
						date: date || undefined,
						rating,
						isCurrent,
						isFavorite,
						showInUniverse,
						status: saveStatus,
						note: note && note.content && note.content.length > 0 ? note : null,
						updatedAt: mode === 'edit' ? item?.updatedAt : undefined
					}

					let savedItem: GardenItem
					if (mode === 'edit') {
						savedItem = (await api.put(`/api/admin/garden/${item?.id}`, payload)) as GardenItem
					} else {
						savedItem = (await api.post('/api/admin/garden', payload)) as GardenItem
					}

					if (loadingToastId) {
						toast.dismiss(loadingToastId)
						toast.success(`Item ${mode === 'edit' ? 'saved' : 'created'}!`)
					}

					item = savedItem
					const submitted = JSON.parse(submittingSnapshot)
					if (mode === 'create') {
						slug = acknowledgeField(slug, submitted[2], savedItem.slug)
						submitted[2] = savedItem.slug
					}
					sourceId = acknowledgeField(sourceId, submitted[6], savedItem.sourceId ?? '')
					metadata = acknowledgeField(
						metadata,
						submitted[7],
						(savedItem.metadata as Record<string, unknown>) ?? null
					)
					submitted[6] = savedItem.sourceId ?? ''
					submitted[7] = savedItem.metadata ?? null
					autoSlug = false
					status = saveStatus
					savedSnapshot = JSON.stringify(submitted)

					if (mode === 'create') {
						mode = 'edit'
						if (!disposed) replaceState(`/admin/garden/${savedItem.id}/edit`, {})
					}
				} catch (err) {
					if (loadingToastId) toast.dismiss(loadingToastId)
					const errStatus =
						err && typeof err === 'object' && 'status' in err
							? (err as { status: number }).status
							: undefined
					if (errStatus !== 409 && !silent) {
						toast.error(`Failed to ${mode === 'edit' ? 'save' : 'create'} item`)
					}
					console.error(err)
					// Only re-throw on the silent (autosave) path — useAutoSave needs the rejection to
					// transition its state machine to 'failed' / 'conflict'. Manual save call sites have
					// already had the error surfaced via toast/console; rethrowing them produces unhandled
					// promise rejections at the fire-and-forget call sites (Cmd+S, form onsubmit, etc).
					if (silent) throw err
				} finally {
					isSaving = false
				}
			}
		)
	}

	async function handleCopyPreviewLink() {
		if (!slug) return
		try {
			const res = await api.post<{ url: string }>('/api/preview/generate', {
				contentType: 'garden',
				slug: `${category}/${slug}`
			})
			if (res?.url) {
				const fullUrl = `${window.location.origin}${res.url}`
				await navigator.clipboard.writeText(fullUrl)
				toast.success('Preview link copied!')
			}
		} catch {
			toast.error('Failed to generate preview link')
		}
	}

	function openDeleteConfirmation() {
		showDeleteConfirmation = true
	}

	async function handleDelete() {
		try {
			await api.delete(`/api/admin/garden/${item?.id}`)
			await lifecycle.navigateAfterDelete('/admin/garden')
		} catch {
			toast.error('Failed to delete item')
		}
	}

	return {
		get item() {
			return item
		},
		get mode() {
			return mode
		},
		get category() {
			return category
		},
		get title() {
			return title
		},
		set title(value: typeof title) {
			title = value
		},
		get slug() {
			return slug
		},
		get creator() {
			return creator
		},
		set creator(value: typeof creator) {
			creator = value
		},
		get imageUrl() {
			return imageUrl
		},
		set imageUrl(value: typeof imageUrl) {
			imageUrl = value
		},
		get url() {
			return url
		},
		get summary() {
			return summary
		},
		set summary(value: typeof summary) {
			summary = value
		},
		get date() {
			return date
		},
		set date(value: typeof date) {
			date = value
		},
		get rating() {
			return rating
		},
		set rating(value: typeof rating) {
			rating = value
		},
		get isCurrent() {
			return isCurrent
		},
		set isCurrent(value: typeof isCurrent) {
			isCurrent = value
		},
		get isFavorite() {
			return isFavorite
		},
		set isFavorite(value: typeof isFavorite) {
			isFavorite = value
		},
		get showInUniverse() {
			return showInUniverse
		},
		set showInUniverse(value: typeof showInUniverse) {
			showInUniverse = value
		},
		get status() {
			return status
		},
		get note() {
			return note
		},
		set note(value: typeof note) {
			note = value
		},
		get selectionState() {
			return selectionState
		},
		get selectedYear() {
			return selectedYear
		},
		get typeaheadRef() {
			return typeaheadRef
		},
		set typeaheadRef(value: typeof typeaheadRef) {
			typeaheadRef = value
		},
		get isSaving() {
			return isSaving
		},
		get activeTab() {
			return activeTab
		},
		set activeTab(value: typeof activeTab) {
			activeTab = value
		},
		get showDeleteConfirmation() {
			return showDeleteConfirmation
		},
		set showDeleteConfirmation(value: typeof showDeleteConfirmation) {
			showDeleteConfirmation = value
		},
		get viewUrl() {
			return viewUrl
		},
		get isSearchable() {
			return isSearchable
		},
		get isDirty() {
			return isDirty
		},
		get autoSave() {
			return autoSave
		},
		get autoSaveLabel() {
			return autoSaveLabel
		},
		get creatorLabel() {
			return creatorLabel
		},
		get searchFn() {
			return searchFn
		},
		get searchPlaceholder() {
			return searchPlaceholder
		},
		get searchEmptyText() {
			return searchEmptyText
		},
		handleSearchSelect,
		handleChangeSelection,
		handleCategoryChange,
		get tabOptions() {
			return tabOptions
		},
		handleTitleInput,
		get lifecycle() {
			return lifecycle
		},
		handleSave,
		handleCopyPreviewLink,
		openDeleteConfirmation,
		handleDelete
	}
}
