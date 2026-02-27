<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation'
	import type { BeforeNavigate } from '@sveltejs/kit'
	import { api } from '$lib/admin/api'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import UnsavedChangesModal from './UnsavedChangesModal.svelte'
	import Composer from './composer'
	import Input from './Input.svelte'
	import Select from './Select.svelte'
	import Switch from './Switch.svelte'
	import Button from './Button.svelte'
	import { toast } from '$lib/stores/toast'
	import { GARDEN_CATEGORIES, getCreatorLabel } from '$lib/constants/garden'
	import type { GardenItem } from '@prisma/client'
	import type { JSONContent } from '@tiptap/core'

	interface Props {
		item?: GardenItem | null
		mode: 'create' | 'edit'
	}

	let { item = null, mode }: Props = $props()

	// Form state
	let category = $state(item?.category ?? 'book')
	let title = $state(item?.title ?? '')
	let slug = $state(item?.slug ?? '')
	let creator = $state(item?.creator ?? '')
	let imageUrl = $state(item?.imageUrl ?? '')
	let url = $state(item?.url ?? '')
	let isCurrent = $state(item?.isCurrent ?? false)
	let isFavorite = $state(item?.isFavorite ?? false)
	let note = $state<JSONContent>(
		(item?.note as JSONContent) ?? { type: 'doc', content: [{ type: 'paragraph' }] }
	)

	// UI state
	let isSaving = $state(false)
	let activeTab = $state('details')
	let showUnsavedChangesModal = $state(false)
	let pendingNavigation = $state<BeforeNavigate | null>(null)
	let autoSlug = $state(mode === 'create')

	// Track original values for dirty checking
	let original = $state({
		category: item?.category ?? 'book',
		title: item?.title ?? '',
		slug: item?.slug ?? '',
		creator: item?.creator ?? '',
		imageUrl: item?.imageUrl ?? '',
		url: item?.url ?? '',
		isCurrent: item?.isCurrent ?? false,
		isFavorite: item?.isFavorite ?? false,
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
			isCurrent !== original.isCurrent ||
			isFavorite !== original.isFavorite ||
			JSON.stringify(note) !== original.note
	)

	const creatorLabel = $derived(getCreatorLabel(category))

	const categoryOptions = GARDEN_CATEGORIES.map((c) => ({
		value: c.value,
		label: c.singular
	}))

	const tabOptions = [
		{ value: 'details', label: 'Details' },
		{ value: 'note', label: 'Note' }
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

	function handleSlugInput() {
		autoSlug = false
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
		if (isDirty && navigation.type !== 'leave') {
			pendingNavigation = navigation
			navigation.cancel()
			showUnsavedChangesModal = true
		}
	})

	async function handleSave() {
		if (!title.trim()) {
			toast.error('Title is required')
			return
		}

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
				isCurrent,
				isFavorite,
				note:
					note && note.content && note.content.length > 0 ? note : null,
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
				isCurrent: savedItem.isCurrent,
				isFavorite: savedItem.isFavorite,
				note: JSON.stringify(savedItem.note ?? { type: 'doc', content: [{ type: 'paragraph' }] })
			}

			if (mode === 'create') {
				goto(`/admin/garden/${savedItem.id}/edit`)
			} else {
				item = savedItem
				// Sync local state with saved data
				slug = savedItem.slug
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

	function handleContinueEditing() {
		showUnsavedChangesModal = false
		pendingNavigation = null
	}

	function handleLeaveWithoutSaving() {
		showUnsavedChangesModal = false
		if (pendingNavigation) {
			const nav = pendingNavigation
			pendingNavigation = null
			nav.to && goto(nav.to.url.pathname)
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
				<Button
					variant="primary"
					buttonSize="medium"
					onclick={() => handleSave()}
					disabled={isSaving}
				>
					{isSaving ? 'Saving...' : 'Save'}
				</Button>
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
						<div class="field-group">
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="field-label">Category</label>
							<Select
								value={category}
								options={categoryOptions}
								onchange={(e) => (category = (e.target as HTMLSelectElement).value)}
							/>
						</div>

						<Input
							label="Title"
							bind:value={title}
							required
							placeholder="Enter title"
							oninput={handleTitleInput}
						/>

						<Input
							label="Slug"
							bind:value={slug}
							placeholder="auto-generated-from-title"
							helpText="Used in the URL. Auto-generated from title unless edited."
							oninput={handleSlugInput}
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

						<Input
							label="External URL"
							type="url"
							bind:value={url}
							placeholder="https://example.com"
						/>

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
								<span class="switch-description">Mark as a perennial favorite</span>
							</div>
							<Switch bind:checked={isFavorite} />
						</div>
					</form>
				</div>
			</div>

			<!-- Note Panel -->
			<div class="panel panel-note" class:active={activeTab === 'note'}>
				<Composer
					bind:data={note}
					placeholder="Write about what you like about this..."
					minHeight={400}
					autofocus={false}
					variant="minimal"
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

	.field-group {
		display: flex;
		flex-direction: column;
		gap: $unit;
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

	.panel-note {
		background: transparent;
		padding: 0;
		min-height: 80vh;
		margin: 0;
		display: flex;
		flex-direction: column;
		width: 100%;

		@include breakpoint('phone') {
			min-height: 600px;
		}
	}
</style>
