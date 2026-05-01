<script lang="ts">
	import { goto, beforeNavigate, replaceState } from '$app/navigation'
	import type { BeforeNavigate } from '@sveltejs/kit'
	import { api } from '$lib/admin/api'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import UnsavedChangesModal from './UnsavedChangesModal.svelte'
	import Composer from './composer'
	import Typeahead from './Typeahead.svelte'
	import GardenSelectionCard from './GardenSelectionCard.svelte'
	import Input from './Input.svelte'
	import StarRating from './StarRating.svelte'
	import Textarea from './Textarea.svelte'
	import StatusDropdown from './StatusDropdown.svelte'
	import DeleteConfirmationModal from './DeleteConfirmationModal.svelte'
	import Switch from './Switch.svelte'
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

	let { item: initialItem = null, mode: initialMode }: Props = $props()

	// Local state so we can transition create → edit in place after first save.
	let item = $state(initialItem)
	let mode = $state<'create' | 'edit'>(initialMode)

	// Form state
	let category = $state<GardenCategory>((item?.category as GardenCategory) ?? 'books')
	let title = $state(item?.title ?? '')
	let slug = $state(item?.slug ?? '')
	let creator = $state(item?.creator ?? '')
	let imageUrl = $state(item?.imageUrl ?? '')
	let url = $state(item?.url ?? '')
	let sourceId = $state(item?.sourceId ?? '')
	let metadata = $state<Record<string, unknown> | null>(
		(item?.metadata as Record<string, unknown>) ?? null
	)
	let summary = $state(item?.summary ?? '')
	let date = $state(item?.date ? new Date(item.date).toISOString().slice(0, 10) : '')
	let rating = $state<number | null>(item?.rating ?? null)
	let isCurrent = $state(item?.isCurrent ?? false)
	let isFavorite = $state(item?.isFavorite ?? false)
	let showInUniverse = $state(item?.showInUniverse ?? false)
	let status = $state<'draft' | 'published'>((item?.status as 'draft' | 'published') ?? 'draft')
	let note = $state<JSONContent>(
		(item?.note as JSONContent) ?? { type: 'doc', content: [{ type: 'paragraph' }] }
	)

	// Selection state: 'empty' = show typeahead, 'selected' = show card, 'changing' = typeahead with pre-filled title
	let selectionState = $state<'empty' | 'selected' | 'changing'>(
		mode === 'edit' && item?.title ? 'selected' : 'empty'
	)

	// Year for display in the selection card (not stored separately, derived from metadata or item)
	let selectedYear = $state<string | null>(null)

	// Component refs
	let typeaheadRef: ReturnType<typeof import('./Typeahead.svelte').default> | undefined = $state()

	// UI state
	let isSaving = $state(false)
	let activeTab = $state('details')
	let showUnsavedChangesModal = $state(false)
	let showDeleteConfirmation = $state(false)
	let pendingNavigation = $state<BeforeNavigate | null>(null)
	let autoSlug = $state(mode === 'create')
	let isSavedNavigation = $state(false)

	const viewUrl = $derived(
		status === 'published' && slug ? `/garden/${category}/${slug}` : undefined
	)

	const isSearchable = $derived(!!SEARCH_CONFIGS[category])

	// Track original values for dirty checking
	let original = $state({
		category: item?.category ?? 'books',
		title: item?.title ?? '',
		slug: item?.slug ?? '',
		creator: item?.creator ?? '',
		imageUrl: item?.imageUrl ?? '',
		url: item?.url ?? '',
		sourceId: item?.sourceId ?? '',
		metadata: JSON.stringify((item?.metadata as Record<string, unknown>) ?? null),
		date: item?.date ? new Date(item.date).toISOString().slice(0, 10) : '',
		rating: item?.rating ?? null,
		isCurrent: item?.isCurrent ?? false,
		isFavorite: item?.isFavorite ?? false,
		showInUniverse: item?.showInUniverse ?? false,
		status: (item?.status as 'draft' | 'published') ?? 'draft',
		note: JSON.stringify(
			(item?.note as JSONContent) ?? { type: 'doc', content: [{ type: 'paragraph' }] }
		)
	})

	const isDirty = $derived(
		category !== original.category ||
			title !== original.title ||
			slug !== original.slug ||
			creator !== original.creator ||
			imageUrl !== original.imageUrl ||
			url !== original.url ||
			sourceId !== original.sourceId ||
			JSON.stringify(metadata) !== original.metadata ||
			date !== original.date ||
			rating !== original.rating ||
			isCurrent !== original.isCurrent ||
			isFavorite !== original.isFavorite ||
			showInUniverse !== original.showInUniverse ||
			status !== original.status ||
			JSON.stringify(note) !== original.note
	)

	const creatorLabel = $derived(getCreatorLabel(category))

	const searchFn = $derived.by(() => {
		const config = SEARCH_CONFIGS[category]
		return config ? createSearchFn(config) : null
	})

	const searchPlaceholder = $derived.by(() => {
		const config = SEARCH_CONFIGS[category]
		return config?.placeholder ?? 'Enter title'
	})

	const searchEmptyText = $derived.by(() => {
		const config = SEARCH_CONFIGS[category]
		return config?.emptyText ?? 'No results found'
	})

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
			slug = generateSlug(selection.result.name)
		}

		selectionState = 'selected'
	}

	function handleChangeSelection() {
		selectionState = 'changing'
		// Wait for typeahead to render, then focus and search
		requestAnimationFrame(() => {
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
			slug = generateSlug(title)
		}

		selectionState = 'empty'
	}

	const tabOptions = [
		{ value: 'details', label: 'Details' },
		{ value: 'thoughts', label: 'Thoughts' }
	]

	// Auto-generate slug from title
	function generateSlug(value: string): string {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/[\s_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
	}

	function handleTitleInput() {
		if (autoSlug) {
			slug = generateSlug(title)
		}
	}

	// Cmd+S keyboard shortcut
	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
				e.preventDefault()
				handleSave()
			}
		}
		document.addEventListener('keydown', handleKeydown)
		return () => document.removeEventListener('keydown', handleKeydown)
	})

	// Browser warning for page unloads
	$effect(() => {
		function handleBeforeUnload(e: BeforeUnloadEvent) {
			if (isDirty) {
				e.preventDefault()
				e.returnValue = ''
			}
		}
		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => window.removeEventListener('beforeunload', handleBeforeUnload)
	})

	// Navigation guard
	beforeNavigate((navigation) => {
		if (isSavedNavigation) return
		if (isDirty && navigation.type !== 'leave') {
			pendingNavigation = navigation
			navigation.cancel()
			showUnsavedChangesModal = true
		}
	})

	async function handleSave(newStatus?: string) {
		if (!title.trim()) {
			toast.error('Title is required')
			return
		}

		const saveStatus = (newStatus as 'draft' | 'published') || status

		isSaving = true
		const loadingToastId = toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} item...`)

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

			toast.dismiss(loadingToastId)
			toast.success(`Item ${mode === 'edit' ? 'saved' : 'created'}!`)

			// Update original to match saved state
			original = {
				category: savedItem.category,
				title: savedItem.title,
				slug: savedItem.slug,
				creator: savedItem.creator ?? '',
				imageUrl: savedItem.imageUrl ?? '',
				url: savedItem.url ?? '',
				sourceId: savedItem.sourceId ?? '',
				metadata: JSON.stringify((savedItem.metadata as Record<string, unknown>) ?? null),
				date: savedItem.date ? new Date(savedItem.date).toISOString().slice(0, 10) : '',
				rating: savedItem.rating ?? null,
				isCurrent: savedItem.isCurrent,
				isFavorite: savedItem.isFavorite,
				showInUniverse: savedItem.showInUniverse,
				status: savedItem.status as 'draft' | 'published',
				note: JSON.stringify(savedItem.note ?? { type: 'doc', content: [{ type: 'paragraph' }] })
			}

			item = savedItem
			// Sync local state with saved data
			status = savedItem.status as 'draft' | 'published'
			slug = savedItem.slug
			sourceId = savedItem.sourceId ?? ''
			metadata = (savedItem.metadata as Record<string, unknown>) ?? null
			if (mode === 'create') {
				mode = 'edit'
				replaceState(`/admin/garden/${savedItem.id}/edit`, {})
			}
		} catch (err) {
			toast.dismiss(loadingToastId)
			if (
				err &&
				typeof err === 'object' &&
				'status' in err &&
				(err as { status: number }).status === 409
			) {
				toast.error('This item has changed in another tab. Please reload.')
			} else {
				toast.error(`Failed to ${mode === 'edit' ? 'save' : 'create'} item`)
			}
			console.error(err)
		} finally {
			isSaving = false
		}
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
			isSavedNavigation = true
			goto('/admin/garden')
		} catch {
			toast.error('Failed to delete item')
		}
	}

	function handleContinueEditing() {
		showUnsavedChangesModal = false
		pendingNavigation = null
	}

	function handleLeaveWithoutSaving() {
		showUnsavedChangesModal = false
		if (pendingNavigation) {
			const nav = pendingNavigation
			pendingNavigation = null
			// Reset original to current values so isDirty becomes false
			original = {
				category,
				title,
				slug,
				creator,
				imageUrl,
				url,
				sourceId,
				metadata: JSON.stringify(metadata),
				date,
				rating,
				isCurrent,
				isFavorite,
				showInUniverse,
				status,
				note: JSON.stringify(note)
			}
			if (nav.to) goto(nav.to.url.pathname)
		}
	}
</script>

<AdminPage>
	{#snippet header()}
		<header>
			<div class="header-left">
				<h1 class="form-title">{title || 'New item'}</h1>
			</div>
			<div class="header-center">
				<AdminSegmentedControl
					options={tabOptions}
					value={activeTab}
					onChange={(value) => (activeTab = value)}
				/>
			</div>
			<div class="header-actions">
				<StatusDropdown
					{status}
					onSave={handleSave}
					disabled={isSaving}
					isLoading={isSaving}
					{viewUrl}
					onDelete={mode === 'edit' ? openDeleteConfirmation : undefined}
					onCopyPreviewLink={slug ? handleCopyPreviewLink : undefined}
				/>
			</div>
		</header>
	{/snippet}

	<div class="admin-container">
		<div class="tab-panels">
			<!-- Details Panel -->
			<div class="panel content-wrapper" class:active={activeTab === 'details'}>
				<div class="form-content">
					<form
						onsubmit={(e) => {
							e.preventDefault()
							handleSave()
						}}
					>
						{#if isSearchable}
							{#if selectionState === 'selected'}
								<GardenSelectionCard
									{title}
									{creator}
									year={selectedYear}
									{imageUrl}
									onChange={handleChangeSelection}
								/>
							{:else}
								<Typeahead
									bind:this={typeaheadRef}
									bind:value={title}
									{category}
									onCategoryChange={handleCategoryChange}
									search={searchFn}
									onSelect={handleSearchSelect}
									oninput={handleTitleInput}
									placeholder={searchPlaceholder}
									emptyText={searchEmptyText}
								/>
							{/if}
						{:else}
							<Typeahead
								bind:value={title}
								{category}
								onCategoryChange={handleCategoryChange}
								search={null}
								oninput={handleTitleInput}
								placeholder="Enter title"
							/>

							<Input
								label={creatorLabel}
								bind:value={creator}
								placeholder="Enter {creatorLabel.toLowerCase()}"
							/>

							<Input
								label="Image URL"
								type="url"
								bind:value={imageUrl}
								placeholder="https://example.com/cover.jpg"
							/>

							{#if imageUrl}
								<div class="image-preview">
									<img src={imageUrl} alt="Preview" />
								</div>
							{/if}
						{/if}

						<StarRating bind:value={rating} />

						<Textarea
							label="Summary"
							bind:value={summary}
							placeholder="Brief description from the source"
							rows={3}
							autoResize
						/>

						<Input label="Date completed (optional)" type="date" bind:value={date} />

						<div class="switch-field">
							<div class="switch-info">
								<span class="switch-label">Currently enjoying</span>
								<span class="switch-description">Mark as something you're into right now</span>
							</div>
							<Switch bind:checked={isCurrent} />
						</div>

						<div class="switch-field">
							<div class="switch-info">
								<span class="switch-label">All-time favorite</span>
								<span class="switch-description">This one's a banger</span>
							</div>
							<Switch bind:checked={isFavorite} />
						</div>

						<div class="switch-field">
							<div class="switch-info">
								<span class="switch-label">Show in Universe</span>
								<span class="switch-description"
									>Include this Garden post in the jedmund.com Everything feed</span
								>
							</div>
							<Switch bind:checked={showInUniverse} />
						</div>
					</form>
				</div>
			</div>

			<!-- Thoughts Panel -->
			<div class="panel panel-thoughts" class:active={activeTab === 'thoughts'}>
				<Composer
					bind:data={note}
					placeholder="Write about what you like about this..."
					minHeight={500}
					autofocus={false}
					variant="full"
				/>
			</div>
		</div>
	</div>
</AdminPage>

<UnsavedChangesModal
	isOpen={showUnsavedChangesModal}
	onContinueEditing={handleContinueEditing}
	onLeave={handleLeaveWithoutSaving}
/>

<DeleteConfirmationModal
	bind:isOpen={showDeleteConfirmation}
	message="Are you sure you want to delete this item? This cannot be undone."
	onConfirm={handleDelete}
/>

<style lang="scss">
	header {
		display: grid;
		grid-template-columns: 250px 1fr 250px;
		align-items: center;
		width: 100%;
		gap: $unit-2x;

		.header-left {
			width: 250px;
			display: flex;
			align-items: center;
			gap: $unit-2x;
		}

		.header-center {
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.header-actions {
			width: 250px;
			display: flex;
			justify-content: flex-end;
			gap: $unit-2x;
		}
	}

	.form-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: $gray-20;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.admin-container {
		width: 100%;
		margin: 0 auto;
		padding: 0 $unit-2x $unit-4x;
		box-sizing: border-box;

		@include breakpoint('phone') {
			padding: 0 $unit-2x $unit-2x;
		}
	}

	.tab-panels {
		position: relative;

		.panel {
			display: none;
			box-sizing: border-box;

			&.active {
				display: block;
			}
		}
	}

	.content-wrapper {
		background: white;
		border-radius: $unit-2x;
		padding: 0;
		width: 100%;
		margin: 0 auto;
	}

	.form-content {
		@include breakpoint('phone') {
			padding: $unit-3x;
		}
	}

	.form-content form {
		display: flex;
		flex-direction: column;
		gap: $unit-6x;
	}

	.field-label {
		font-size: 14px;
		font-weight: 500;
		color: $gray-20;
	}

	.image-preview {
		width: 120px;
		height: 120px;
		border-radius: $unit;
		overflow: hidden;
		background-color: $gray-95;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.switch-field {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $unit-2x;
	}

	.switch-info {
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}

	.switch-label {
		font-size: 14px;
		font-weight: 500;
		color: $gray-20;
	}

	.switch-description {
		font-size: 0.875rem;
		color: $gray-40;
	}

	.panel-thoughts {
		background: transparent;
		padding: $unit-3x;
		min-height: 80vh;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 1200px;

		@include breakpoint('phone') {
			padding: $unit-2x;
			min-height: 600px;
		}
	}
</style>
