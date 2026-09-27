<script lang="ts">
	import AdminPage from './AdminPage.svelte'
	import FormPageHeader from '$lib/components/admin/forms/FormPageHeader.svelte'
	import UnsavedChangesModal from './UnsavedChangesModal.svelte'
	import Composer from './composer/ComposerCore.svelte'
	import Typeahead from './Typeahead.svelte'
	import GardenSelectionCard from './GardenSelectionCard.svelte'
	import Input from './Input.svelte'
	import StarRating from './StarRating.svelte'
	import Textarea from './Textarea.svelte'
	import StatusDropdown from './StatusDropdown.svelte'
	import DeleteConfirmationModal from './DeleteConfirmationModal.svelte'
	import Switch from './Switch.svelte'
	import type { GardenItem } from '@prisma/client'
	import { untrack } from 'svelte'
	import { createGardenForm } from '$lib/components/admin/forms/createGardenForm.svelte'
	interface Props {
		item?: GardenItem | null
		mode: 'create' | 'edit'
	}

	let { item: initialItem = null, mode: initialMode }: Props = $props()
	const form = untrack(() => createGardenForm({ item: initialItem, mode: initialMode }))
</script>

<AdminPage>
	{#snippet header()}
		<FormPageHeader
			title={form.title || 'New item'}
			tabs={form.tabOptions}
			bind:activeTab={form.activeTab}
		>
			{#snippet actions()}
				<StatusDropdown
					status={form.status}
					onSave={(target) => {
						if (form.status === 'draft' && target !== 'draft' && form.isDirty) {
							form.autoSave.flush().then(
								() => form.handleSave(target),
								() => {
									/* form.autoSave already surfaced the failure via its trigger label */
								}
							)
						} else {
							form.handleSave(target)
						}
					}}
					disabled={form.isSaving}
					isLoading={form.isSaving}
					triggerText={form.status === 'draft' ? form.autoSaveLabel : undefined}
					viewUrl={form.viewUrl}
					onDelete={form.mode === 'edit' ? form.openDeleteConfirmation : undefined}
					onCopyPreviewLink={form.slug ? form.handleCopyPreviewLink : undefined}
				/>
			{/snippet}
		</FormPageHeader>
	{/snippet}

	<div class="admin-container">
		<div class="tab-panels">
			<!-- Details Panel -->
			<div class="panel content-wrapper" class:active={form.activeTab === 'details'}>
				<div class="form-content">
					<form
						onsubmit={(e) => {
							e.preventDefault()
							form.handleSave(form.status)
						}}
					>
						{#if form.isSearchable}
							{#if form.selectionState === 'selected'}
								<GardenSelectionCard
									title={form.title}
									creator={form.creator}
									year={form.selectedYear}
									imageUrl={form.imageUrl}
									onChange={form.handleChangeSelection}
								/>
							{:else}
								<Typeahead
									bind:this={form.typeaheadRef}
									bind:value={form.title}
									category={form.category}
									onCategoryChange={form.handleCategoryChange}
									search={form.searchFn}
									onSelect={form.handleSearchSelect}
									oninput={form.handleTitleInput}
									placeholder={form.searchPlaceholder}
									emptyText={form.searchEmptyText}
								/>
							{/if}
						{:else}
							<Typeahead
								bind:value={form.title}
								category={form.category}
								onCategoryChange={form.handleCategoryChange}
								search={null}
								oninput={form.handleTitleInput}
								placeholder="Enter title"
							/>

							<Input
								label={form.creatorLabel}
								bind:value={form.creator}
								placeholder="Enter {form.creatorLabel.toLowerCase()}"
							/>

							<Input
								label="Image URL"
								type="url"
								bind:value={form.imageUrl}
								placeholder="https://example.com/cover.jpg"
							/>

							{#if form.imageUrl}
								<div class="image-preview">
									<img src={form.imageUrl} alt="Preview" />
								</div>
							{/if}
						{/if}

						<StarRating bind:value={form.rating} />

						<Textarea
							label="Summary"
							bind:value={form.summary}
							placeholder="Brief description from the source"
							rows={3}
							autoResize
						/>

						<Input label="Date completed (optional)" type="date" bind:value={form.date} />

						<div class="switch-field">
							<div class="switch-info">
								<span class="switch-label">Currently enjoying</span>
								<span class="switch-description">Mark as something you're into right now</span>
							</div>
							<Switch bind:checked={form.isCurrent} />
						</div>

						<div class="switch-field">
							<div class="switch-info">
								<span class="switch-label">All-time favorite</span>
								<span class="switch-description">This one's a banger</span>
							</div>
							<Switch bind:checked={form.isFavorite} />
						</div>

						<div class="switch-field">
							<div class="switch-info">
								<span class="switch-label">Show in Universe</span>
								<span class="switch-description"
									>Include this Garden post in the jedmund.com Everything feed</span
								>
							</div>
							<Switch bind:checked={form.showInUniverse} />
						</div>
					</form>
				</div>
			</div>

			<!-- Thoughts Panel -->
			<div class="panel panel-thoughts" class:active={form.activeTab === 'thoughts'}>
				<Composer
					bind:data={form.note}
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
	isOpen={form.lifecycle.showUnsavedChangesModal}
	onContinueEditing={form.lifecycle.handleContinueEditing}
	onLeave={form.lifecycle.handleLeaveWithoutSaving}
/>

<DeleteConfirmationModal
	bind:isOpen={form.showDeleteConfirmation}
	message="Are you sure you want to delete this item? This cannot be undone."
	onConfirm={form.handleDelete}
/>

<style lang="scss">
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
