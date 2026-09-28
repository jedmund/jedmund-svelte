import { onDestroy } from 'svelte'
import type { Tag } from './tag-types'
import { createCollectionSession } from './collection'
import { listTags, saveTag, deleteTag, mergeTags } from './tags-requests'

export function createTagsController(initial: Tag[]) {
	let tags = $state<Tag[]>(initial)
	let isLoading = $state(false)
	let searchQuery = $state('')
	let sort = $state('name-asc')

	const sortOptions = [
		{ value: 'name-asc', label: 'Name (A-Z)' },
		{ value: 'name-desc', label: 'Name (Z-A)' },
		{ value: 'usage-desc', label: 'Most used' },
		{ value: 'usage-asc', label: 'Least used' },
		{ value: 'recent-desc', label: 'Newest' },
		{ value: 'recent-asc', label: 'Oldest' }
	]
	let selectedTags = $state<number[]>([])
	let showMergeModal = $state(false)
	let mergeTargetId = $state<number | null>(null)
	let editingTag = $state<Tag | null>(null)
	let showCreateModal = $state(false)
	let showDeleteConfirmation = $state(false)
	let deletingTagId = $state<number | null>(null)
	let newTagName = $state('')
	let newTagDescription = $state('')

	const collection = createCollectionSession<Tag>((next, loading, error) => {
		tags = next
		isLoading = loading
		if (error) alert(error)
	}, initial)
	function fetchTags() {
		return collection.load((signal) => listTags(searchQuery, sort, signal))
	}
	$effect(() => {
		const query = searchQuery
		const order = sort
		collection.invalidate()
		const timer = setTimeout(() => {
			void collection.load((signal) => listTags(query, order, signal))
		}, 300)
		return () => clearTimeout(timer)
	})
	onDestroy(() => collection.dispose())

	// Create new tag
	async function handleCreateTag() {
		if (!newTagName.trim()) return
		const name = newTagName
		const description = newTagDescription

		try {
			if (
				!(await collection.mutate('create', (signal) =>
					saveTag({ name, description: description || undefined }, undefined, signal)
				))
			)
				return

			if (newTagName === name && newTagDescription === description) {
				showCreateModal = false
				newTagName = ''
				newTagDescription = ''
			}
			await fetchTags()
		} catch (error) {
			console.error('Failed to create tag:', error)
			alert('Failed to create tag')
		}
	}

	// Update tag
	async function handleUpdateTag() {
		if (!editingTag) return

		try {
			const tag = { ...editingTag }
			if (
				!(await collection.mutate(tag.id, (signal) =>
					saveTag(
						{ name: tag.displayName, description: tag.description || undefined },
						tag.id,
						signal
					)
				))
			)
				return

			if (
				editingTag?.id === tag.id &&
				editingTag.displayName === tag.displayName &&
				editingTag.description === tag.description
			)
				editingTag = null
			await fetchTags()
		} catch (error) {
			console.error('Failed to update tag:', error)
			alert('Failed to update tag')
		}
	}

	// Delete tag
	function handleDeleteTag(tagId: number) {
		deletingTagId = tagId
		showDeleteConfirmation = true
	}

	async function confirmDelete() {
		if (!deletingTagId) return

		try {
			const id = deletingTagId
			if (!(await collection.mutate(id, (signal) => deleteTag(id, signal)))) return

			await fetchTags()
		} catch (error) {
			console.error('Failed to delete tag:', error)
			alert('Failed to delete tag')
		} finally {
			deletingTagId = null
		}
	}

	// Merge tags
	async function handleMergeTags() {
		if (selectedTags.length === 0 || !mergeTargetId) {
			alert('Please select tags to merge and a target tag')
			return
		}

		const sourceIds = selectedTags.filter((id) => id !== mergeTargetId)

		if (sourceIds.length === 0) {
			alert('Please select at least one source tag different from the target')
			return
		}

		if (!confirm(`Merge ${sourceIds.length} tag(s) into the selected target?`)) {
			return
		}

		try {
			const target = mergeTargetId
			if (!(await collection.mutate('merge', (signal) => mergeTags(sourceIds, target, signal))))
				return

			showMergeModal = false
			selectedTags = []
			mergeTargetId = null
			await fetchTags()
		} catch (error) {
			console.error('Failed to merge tags:', error)
			alert('Failed to merge tags')
		}
	}

	// Toggle tag selection
	function toggleTagSelection(tagId: number) {
		if (selectedTags.includes(tagId)) {
			selectedTags = selectedTags.filter((id) => id !== tagId)
		} else {
			selectedTags = [...selectedTags, tagId]
		}
	}
	return {
		get tags() {
			return tags
		},
		set tags(value: typeof tags) {
			tags = value
		},
		get isLoading() {
			return isLoading
		},
		set isLoading(value: typeof isLoading) {
			isLoading = value
		},
		get searchQuery() {
			return searchQuery
		},
		set searchQuery(value: typeof searchQuery) {
			searchQuery = value
		},
		get sort() {
			return sort
		},
		set sort(value: typeof sort) {
			sort = value
		},
		get selectedTags() {
			return selectedTags
		},
		set selectedTags(value: typeof selectedTags) {
			selectedTags = value
		},
		get showMergeModal() {
			return showMergeModal
		},
		set showMergeModal(value: typeof showMergeModal) {
			showMergeModal = value
		},
		get mergeTargetId() {
			return mergeTargetId
		},
		set mergeTargetId(value: typeof mergeTargetId) {
			mergeTargetId = value
		},
		get editingTag() {
			return editingTag
		},
		set editingTag(value: typeof editingTag) {
			editingTag = value
		},
		get showCreateModal() {
			return showCreateModal
		},
		set showCreateModal(value: typeof showCreateModal) {
			showCreateModal = value
		},
		get showDeleteConfirmation() {
			return showDeleteConfirmation
		},
		set showDeleteConfirmation(value: typeof showDeleteConfirmation) {
			showDeleteConfirmation = value
		},
		get deletingTagId() {
			return deletingTagId
		},
		set deletingTagId(value: typeof deletingTagId) {
			deletingTagId = value
		},
		get newTagName() {
			return newTagName
		},
		set newTagName(value: typeof newTagName) {
			newTagName = value
		},
		get newTagDescription() {
			return newTagDescription
		},
		set newTagDescription(value: typeof newTagDescription) {
			newTagDescription = value
		},
		sortOptions,
		handleCreateTag,
		handleUpdateTag,
		handleDeleteTag,
		confirmDelete,
		handleMergeTags,
		toggleTagSelection
	}
}
