<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import FormFieldWrapper from '$lib/components/admin/FormFieldWrapper.svelte'
	import PublishDropdown from '$lib/components/admin/PublishDropdown.svelte'

	// Form state
	let title = $state('')
	let slug = $state('')
	let description = $state('')
	let date = $state('')
	let location = $state('')
	let isPhotography = $state(false)
	let showInUniverse = $state(false)
	let status = $state<'draft' | 'published'>('draft')

	// UI state
	let isSaving = $state(false)
	let error = $state('')

	// Auto-generate slug from title
	$effect(() => {
		if (title && !slug) {
			slug = generateSlug(title)
		}
	})

	function generateSlug(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
	}

	async function handleSave(publishStatus: 'draft' | 'published') {
		if (!title.trim()) {
			error = 'Title is required'
			return
		}

		if (!slug.trim()) {
			error = 'Slug is required'
			return
		}

		try {
			isSaving = true
			error = ''

			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const albumData = {
				title: title.trim(),
				slug: slug.trim(),
				description: description.trim() || null,
				date: date ? new Date(date).toISOString() : null,
				location: location.trim() || null,
				isPhotography,
				showInUniverse,
				status: publishStatus
			}

			const response = await fetch('/api/albums', {
				method: 'POST',
				headers: {
					'Authorization': `Basic ${auth}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(albumData)
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to create album')
			}

			const album = await response.json()
			
			// Redirect to album edit page or albums list
			goto(`/admin/albums/${album.id}/edit`)

		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create album'
			console.error('Failed to create album:', err)
		} finally {
			isSaving = false
		}
	}

	function handleCancel() {
		goto('/admin/albums')
	}


	const canSave = $derived(title.trim().length > 0 && slug.trim().length > 0)
</script>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<button class="btn-icon" onclick={handleCancel}>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path
						d="M12.5 15L7.5 10L12.5 5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
			<h1>New Album</h1>
		</div>
		<div class="header-actions">
			<div class="publish-dropdown">
				<Button
					variant="primary"
					buttonSize="large"
					onclick={() => handleSave('published')}
					disabled={!canSave || isSaving}
				>
					{isSaving ? 'Publishing...' : 'Publish'}
				</Button>
				<Button
					variant="ghost"
					iconOnly
					buttonSize="large"
					onclick={(e) => {
						e.stopPropagation()
						isPublishDropdownOpen = !isPublishDropdownOpen
					}}
					disabled={isSaving}
				>
					<svg slot="icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
						<path
							d="M3 4.5L6 7.5L9 4.5"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</Button>
				{#if isPublishDropdownOpen}
					<DropdownMenuContainer>
						<DropdownItem onclick={() => {handleSave('draft'); isPublishDropdownOpen = false}}>
							Save as Draft
						</DropdownItem>
					</DropdownMenuContainer>
				{/if}
			</div>
		</div>
	</header>

	<div class="album-form">
		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<div class="form-section">
			<h2>Album Details</h2>
			
			<Input
				label="Title"
				bind:value={title}
				placeholder="Enter album title"
				required
				disabled={isSaving}
				fullWidth
			/>

			<Input
				label="Slug"
				bind:value={slug}
				placeholder="album-url-slug"
				helpText="Used in the album URL. Auto-generated from title."
				disabled={isSaving}
				fullWidth
			/>

			<Input
				type="textarea"
				label="Description"
				bind:value={description}
				placeholder="Describe this album..."
				rows={3}
				disabled={isSaving}
				fullWidth
			/>

			<div class="form-row">
				<Input
					type="date"
					label="Date"
					bind:value={date}
					helpText="When was this album created or photos taken?"
					disabled={isSaving}
				/>

				<Input
					label="Location"
					bind:value={location}
					placeholder="Location where photos were taken"
					disabled={isSaving}
				/>
			</div>
		</div>

		<div class="form-section">
			<h2>Album Settings</h2>

			<!-- Photography Toggle -->
			<FormFieldWrapper label="Album Type">
				<div class="photography-toggle">
					<label class="toggle-label">
						<input
							type="checkbox"
							bind:checked={isPhotography}
							disabled={isSaving}
							class="toggle-input"
						/>
						<span class="toggle-slider"></span>
						<div class="toggle-content">
							<span class="toggle-title">Photography Album</span>
							<span class="toggle-description">Show this album in the photography experience</span>
						</div>
					</label>
				</div>
			</FormFieldWrapper>

			<!-- Show in Universe Toggle -->
			<FormFieldWrapper label="Visibility">
				<div class="universe-toggle">
					<label class="toggle-label">
						<input
							type="checkbox"
							bind:checked={showInUniverse}
							disabled={isSaving}
							class="toggle-input"
						/>
						<span class="toggle-slider"></span>
						<div class="toggle-content">
							<span class="toggle-title">Show in Universe</span>
							<span class="toggle-description">Display this album in the Universe feed</span>
						</div>
					</label>
				</div>
			</FormFieldWrapper>
		</div>
	</div>
</AdminPage>

<style lang="scss">
	@import '$styles/variables.scss';

	.header-left {
		display: flex;
		align-items: center;
		gap: $unit-2x;

		h1 {
			font-size: 1.5rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
		}
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}

	.publish-dropdown {
		position: relative;
		display: flex;
		gap: $unit-half;
	}

	.btn-icon {
		width: 40px;
		height: 40px;
		border: none;
		background: none;
		color: $grey-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;

		&:hover {
			background: $grey-90;
			color: $grey-10;
		}
	}

	.album-form {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: $unit-6x;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: $unit-3x;
		border-radius: $unit-2x;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;

		h2 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0;
			color: $grey-10;
			border-bottom: 1px solid $grey-85;
			padding-bottom: $unit-2x;
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-3x;

		@include breakpoint('tablet') {
			grid-template-columns: 1fr;
		}
	}

	.photography-toggle,
	.universe-toggle {
		.toggle-label {
			display: flex;
			align-items: center;
			gap: $unit-3x;
			cursor: pointer;
			user-select: none;
		}

		.toggle-input {
			position: absolute;
			opacity: 0;
			pointer-events: none;

			&:checked + .toggle-slider {
				background-color: $blue-60;

				&::before {
					transform: translateX(20px);
				}
			}

			&:disabled + .toggle-slider {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.toggle-slider {
			position: relative;
			width: 44px;
			height: 24px;
			background-color: $grey-80;
			border-radius: 12px;
			transition: background-color 0.2s ease;
			flex-shrink: 0;

			&::before {
				content: '';
				position: absolute;
				top: 2px;
				left: 2px;
				width: 20px;
				height: 20px;
				background-color: white;
				border-radius: 50%;
				transition: transform 0.2s ease;
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
			}
		}

		.toggle-content {
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.toggle-title {
				font-weight: 500;
				color: $grey-10;
				font-size: 0.875rem;
			}

			.toggle-description {
				font-size: 0.75rem;
				color: $grey-50;
				line-height: 1.4;
			}
		}
	}
</style>