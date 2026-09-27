<script lang="ts">
	import { untrack } from 'svelte'
	import Modal from './Modal.svelte'
	import LoadingSpinner from './LoadingSpinner.svelte'
	import MediaGrid from './MediaGrid.svelte'
	import LibraryHeader from './media/LibraryHeader.svelte'
	import LibraryActions from './media/LibraryActions.svelte'
	import { InfiniteLoader, LoaderState } from 'svelte-infinite'
	import type { Media } from '@prisma/client'
	import { createLibrarySession, emptyLibrary } from '$lib/admin/media/library-session'
	import { createMembershipSession } from '$lib/admin/media/membership-session'
	import { changeAlbumMembership } from '$lib/admin/media/requests'
	interface Props {
		isOpen: boolean
		mode?: 'single' | 'multiple'
		fileType?: 'image' | 'video' | 'all'
		albumId?: number
		selectedIds?: number[]
		title?: string
		confirmText?: string
		showInAlbumMode?: boolean
		onSelect?: (media: Media | Media[]) => void | Promise<void>
		onClose?: () => void
		onSave?: () => void | Promise<void>
	}
	let {
		isOpen = $bindable(),
		mode = 'multiple',
		fileType = 'all',
		albumId,
		selectedIds = [],
		title = '',
		confirmText = '',
		showInAlbumMode = false,
		onSelect,
		onClose,
		onSave
	}: Props = $props()
	let library = $state.raw(emptyLibrary())
	let initialIds = $state<number[]>([])
	let isSaving = $state(false)
	let error = $state('')
	let filterType = $state<string>(fileType)
	let photographyFilter = $state('all')
	let searchQuery = $state('')
	const loaderState = new LoaderState()
	const session = createLibrarySession({
		onChange: (state) => {
			library = state
			if (state.loading) return
			if (state.error) loaderState.error()
			else if (state.page >= state.totalPages) loaderState.complete()
			else loaderState.loaded()
		}
	})
	let membership: ReturnType<typeof createMembershipSession> | undefined
	let generation = 0
	const computedTitle = $derived(
		title ||
			(showInAlbumMode
				? 'Add Photos to Album'
				: mode === 'single'
					? 'Select Media'
					: 'Select Media Files')
	)
	const computedConfirmText = $derived(
		confirmText || (showInAlbumMode ? 'Add Photos' : mode === 'single' ? 'Select' : 'Select Files')
	)
	const addCount = $derived(
		[...library.selectedIds].filter((id) => !initialIds.includes(id)).length
	)
	const removeCount = $derived(initialIds.filter((id) => !library.selectedIds.has(id)).length)
	const canConfirm = $derived(
		!isSaving &&
			(showInAlbumMode
				? !!albumId && (addCount > 0 || removeCount > 0)
				: library.selectedIds.size > 0)
	)
	const footerText = $derived(
		showInAlbumMode
			? `${library.selectedIds.size} photos selected (${addCount} to add, ${removeCount} to remove)`
			: `${library.selectedIds.size} item${library.selectedIds.size === 1 ? '' : 's'} selected`
	)
	$effect(() => {
		if (!isOpen) return
		untrack(() => {
			generation++
			initialIds = [...selectedIds]
			error = ''
			isSaving = false
			session.open(selectedIds)
			const id = albumId
			membership = id
				? createMembershipSession(selectedIds, (mediaId, selected, signal) =>
						changeAlbumMembership(id, [mediaId], selected, signal)
					)
				: undefined
		})
		return () => {
			generation++
			session.close()
			membership?.close()
		}
	})
	$effect(() => {
		if (!isOpen) return
		const filters = {
			type: filterType,
			photography: photographyFilter,
			search: searchQuery,
			albumId: showInAlbumMode ? undefined : albumId
		}
		untrack(() => {
			loaderState.reset()
			session.search(filters, 300)
		})
	})
	function handleClose() {
		generation++
		session.close()
		membership?.close()
		isOpen = false
		onClose?.()
	}
	async function handleConfirm() {
		if (!canConfirm) return
		const current = generation
		isSaving = true
		error = ''
		try {
			if (showInAlbumMode && membership) {
				if (!(await membership.save(library.selectedIds)) || current !== generation) return
				await onSave?.()
			} else {
				const selected = await session.selected()
				if (!selected || current !== generation) return
				if (mode === 'single') await onSelect?.(selected[0])
				else await onSelect?.(selected)
			}
			if (current === generation) handleClose()
		} catch (cause) {
			if (current === generation)
				error = cause instanceof Error ? cause.message : 'Failed to select media'
		} finally {
			if (current === generation) isSaving = false
		}
	}
</script>

<Modal bind:isOpen onClose={handleClose} size="large" showCloseButton={false}>
	<div class="unified-media-modal">
		<!-- Sticky Header -->
		<LibraryHeader
			title={computedTitle}
			{error}
			bind:filterType
			bind:photographyFilter
			bind:searchQuery
			onClose={handleClose}
		/>

		<!-- Media Grid -->
		<div class="media-grid-container">
			<MediaGrid
				media={library.media}
				selectedIds={library.selectedIds}
				onItemClick={(item) => {
					if (!isSaving) session.toggle(item, mode === 'single')
				}}
				isLoading={library.loading && library.media.length === 0}
				emptyMessage={fileType !== 'all'
					? 'No media found. Try adjusting your filters or search'
					: 'No media found. Try adjusting your search or filters'}
				mode="select"
			/>

			<!-- Infinite Loader -->
			<InfiniteLoader
				{loaderState}
				triggerLoad={session.more}
				intersectionOptions={{ rootMargin: '0px 0px 200px 0px' }}
			>
				<div style="height: 1px;"></div>

				{#snippet loading()}
					<div class="loading-container">
						<LoadingSpinner size="medium" text="Loading more..." />
					</div>
				{/snippet}

				{#snippet error()}
					<div class="error-retry">
						<p class="error-text">Failed to load media</p>
						<button
							class="retry-button"
							onclick={() => {
								loaderState.reset()
								session.more()
							}}
						>
							Try again
						</button>
					</div>
				{/snippet}

				{#snippet noData()}
					<!-- Empty snippet to hide "No more data" text -->
				{/snippet}
			</InfiniteLoader>
		</div>

		<!-- Footer -->
		<LibraryActions
			summary={footerText}
			{canConfirm}
			{isSaving}
			{showInAlbumMode}
			confirmText={computedConfirmText}
			onClose={handleClose}
			onConfirm={handleConfirm}
		/>
	</div>
</Modal>

<style lang="scss">
	.unified-media-modal {
		display: flex;
		flex-direction: column;
		min-height: 600px;
		position: relative;
		padding: 0;
	}

	.media-grid-container {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 0 $unit-3x;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: $unit-4x;
	}

	.error-retry {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-4x;

		.error-text {
			color: $gray-40;
			margin: 0;
		}

		.retry-button {
			padding: $unit $unit-2x;
			background: white;
			border: 1px solid $gray-80;
			border-radius: $unit;
			color: $gray-20;
			font-size: 0.875rem;
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover {
				background: $gray-95;
				border-color: $gray-70;
			}
		}
	}

	// Match search input font size to select dropdowns

	// Hide the infinite scroll intersection target
	:global(.infinite-intersection-target) {
		height: 0 !important;
		margin: 0 !important;
		padding: 0 !important;
		visibility: hidden;
	}
</style>
