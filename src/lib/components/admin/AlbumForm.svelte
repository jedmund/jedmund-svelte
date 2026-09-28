<script lang="ts">
	import AdminPage from './AdminPage.svelte'
	import UnsavedChangesModal from './UnsavedChangesModal.svelte'
	import FormPageHeader from '$lib/components/admin/forms/FormPageHeader.svelte'
	import Button from './Button.svelte'
	import AlbumDetailsSection from './forms/AlbumDetailsSection.svelte'
	import UnifiedMediaModal from './UnifiedMediaModal.svelte'
	import SmartImage from '../SmartImage.svelte'
	import Composer from './composer/ComposerCore.svelte'
	import SyndicationStatus from './SyndicationStatus.svelte'
	import type { Album } from '@prisma/client'
	import { untrack } from 'svelte'
	import { createAlbumForm } from '$lib/components/admin/forms/createAlbumForm.svelte'
	interface Props {
		album?: Album | null
		mode: 'create' | 'edit'
	}

	let { album: initialAlbum = null, mode: initialMode }: Props = $props()
	const form = untrack(() => createAlbumForm({ album: initialAlbum, mode: initialMode }))
</script>

<AdminPage>
	{#snippet header()}
		<FormPageHeader
			title={form.formData.title || 'Untitled Album'}
			tabs={form.tabOptions}
			bind:activeTab={form.activeTab}
		>
			{#snippet actions()}
				<Button variant="primary" onclick={form.handleSave} disabled={form.isSaving}>
					{form.isSaving ? 'Saving...' : 'Save'}
				</Button>
			{/snippet}
		</FormPageHeader>
	{/snippet}

	<div class="admin-container">
		<div class="tab-panels">
			<!-- Metadata Panel -->
			<div class="panel content-wrapper" class:active={form.activeTab === 'metadata'}>
				<AlbumDetailsSection
					bind:title={form.formData.title}
					bind:slug={form.formData.slug}
					bind:location={form.formData.location}
					bind:year={form.formData.year}
					bind:status={form.formData.status}
					bind:showInUniverse={form.formData.showInUniverse}
					editing={form.mode === 'edit'}
					heartCount={form.heartCount}
				/>
				{#if form.mode === 'edit' && form.album?.id}
					<SyndicationStatus
						contentType="album"
						contentId={form.album.id}
						contentStatus={form.formData.status}
					/>
				{/if}

				{#if form.mode === 'edit' && form.pendingMediaIds.length > 0}
					<p class="selected-count">
						{form.pendingMediaIds.length} photo additions pending. Save to retry.
					</p>
				{/if}
				<!-- Photos Grid -->
				<div class="form-section">
					<div class="section-header">
						<h3 class="section-title">
							Photos {form.albumMedia.length > 0 || form.pendingMediaIds.length > 0
								? `(${form.mode === 'edit' ? form.albumMedia.length : form.pendingMediaIds.length})`
								: ''}
						</h3>
						<button class="btn-secondary" onclick={() => (form.showBulkAlbumModal = true)}>
							{form.mode === 'create' ? 'Select Photos' : 'Manage Photos'}
						</button>
					</div>
					{#if form.mode === 'edit' && form.albumMedia.length > 0}
						<div class="photos-grid">
							{#each form.albumMedia as item}
								<div class="photo-item">
									<SmartImage
										media={item.media}
										alt={item.media.description || item.media.filename}
										sizes="(max-width: 768px) 50vw, 25vw"
									/>
								</div>
							{/each}
						</div>
					{:else if form.mode === 'create' && form.pendingMediaIds.length > 0}
						<p class="selected-count">
							{form.pendingMediaIds.length} photo{form.pendingMediaIds.length !== 1 ? 's' : ''} selected.
							They will be added when you save the album.
						</p>
					{:else}
						<p class="empty-state">
							No photos {form.mode === 'create' ? 'selected' : 'added'} yet. Click "{form.mode ===
							'create'
								? 'Select Photos'
								: 'Manage Photos'}" to {form.mode === 'create' ? 'select' : 'add'} photos.
						</p>
					{/if}
				</div>
			</div>

			<!-- Content Panel -->
			<div class="panel panel-content" class:active={form.activeTab === 'content'}>
				<Composer
					bind:data={form.formData.content}
					placeholder="Add album content..."
					albumId={form.album?.id}
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

<!-- Media Modal -->
<UnifiedMediaModal
	bind:isOpen={form.showBulkAlbumModal}
	albumId={form.album?.id}
	selectedIds={form.mode === 'edit' ? form.existingMediaIds : form.pendingMediaIds}
	showInAlbumMode={form.mode === 'edit'}
	onSave={form.mode === 'edit' ? form.handleBulkAlbumSave : undefined}
	onSelect={form.mode === 'create' ? form.handlePhotoSelection : undefined}
	mode="multiple"
	title={form.mode === 'create' ? 'Select Photos for Album' : 'Manage Album Photos'}
	confirmText={form.mode === 'create' ? 'Select Photos' : 'Update Photos'}
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
		width: 100%;
		margin: 0 auto;

		@include breakpoint('phone') {
			padding: $unit-3x;
		}
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;

		&:not(:last-child) {
			margin-bottom: $unit-6x;
		}
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: $gray-10;
		margin: 0;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.photos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: $unit-2x;

		@include breakpoint('phone') {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.photo-item {
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: $unit;
		background: $gray-95;

		:global(img) {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.panel-content {
		background: white;
		padding: 0;
		min-height: 80vh;
		margin: 0 auto;
		display: flex;
		flex-direction: column;

		@include breakpoint('phone') {
			min-height: 600px;
		}
	}

	// Button styles
	.btn-secondary {
		padding: $unit $unit-2x;
		border: 1px solid $gray-80;
		background: white;
		color: $gray-20;
		border-radius: 8px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-95;
			border-color: $gray-70;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.empty-state {
		color: $gray-50;
		font-size: 0.875rem;
		text-align: center;
		padding: $unit-4x;
		background: $gray-95;
		border-radius: $unit;
		margin: 0;
	}

	.selected-count {
		color: $gray-30;
		font-size: 0.875rem;
		padding: $unit-2x;
		margin: 0;
		background: $gray-95;
		border-radius: $unit;
		border: 1px solid $gray-90;
	}
</style>
