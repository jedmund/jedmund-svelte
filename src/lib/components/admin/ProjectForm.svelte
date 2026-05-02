<script lang="ts">
	import { goto, beforeNavigate, replaceState } from '$app/navigation'
	import type { BeforeNavigate } from '@sveltejs/kit'
	import { api } from '$lib/admin/api'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import StatusDropdown from './StatusDropdown.svelte'
	import UnsavedChangesModal from './UnsavedChangesModal.svelte'
	import Composer from './composer'
	import ProjectMetadataForm from './ProjectMetadataForm.svelte'
	import ProjectBrandingForm from './ProjectBrandingForm.svelte'
	import { useAutoSave } from './forms/useAutoSave.svelte'
	import { toast } from '$lib/stores/toast'
	import type { Project, ProjectStatus } from '$lib/types/project'
	import { createProjectFormStore } from '$lib/stores/project-form.svelte'

	interface Props {
		project?: Project | null
		mode: 'create' | 'edit'
	}

	let { project: initialProject = null, mode: initialMode }: Props = $props()

	// Local state so we can transition create → edit in place after first save.
	let project = $state(initialProject)
	let mode = $state<'create' | 'edit'>(initialMode)

	// Form store - centralized state management
	const formStore = createProjectFormStore(project)

	// UI state
	let isLoading = $state(mode === 'edit')
	let hasLoaded = $state(mode === 'create')
	let isSaving = $state(false)
	let activeTab = $state('metadata')
	let showUnsavedChangesModal = $state(false)
	let pendingNavigation = $state<BeforeNavigate | null>(null)
	let allowNavigation = $state(false)

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'branding', label: 'Branding' },
		{ value: 'case-study', label: 'Case Study' }
	]

	// Snapshot dirty tracking — same pattern as PostForm/GardenItemForm. The store's own isDirty would
	// also work, but a local snapshot is simpler to thread through the autosave race fix (capture
	// submittingSnapshot before await, restore on success — mid-save keystrokes stay dirty).
	function snapshot(): string {
		return JSON.stringify(formStore.fields)
	}
	let savedSnapshot = $state<string>(snapshot())
	let isDirty = $derived(snapshot() !== savedSnapshot)

	// Status-specific dropdown labels for project's extra statuses (list-only, password-protected);
	// StatusDropdown handles draft/published defaults itself.
	const altActions = $derived.by(() => {
		const s = formStore.fields.status
		if (s === 'draft' || s === 'published') return undefined
		return [
			{ label: 'Publish', target: 'published' },
			{ label: 'Save as draft', target: 'draft' }
		]
	})

	const primaryLabel = $derived.by(() => {
		const s = formStore.fields.status
		if (s === 'draft' || s === 'published') return undefined
		return 'Save'
	})

	const viewUrl = $derived(
		mode === 'edit' && project?.slug
			? `/${formStore.fields.projectType === 'labs' ? 'labs' : 'work'}/${project.slug}?preview=true`
			: undefined
	)

	// Auto-save runs only for drafts and only after a title is set (the schema requires title; firing
	// before that would just produce 'Save failed' visually and confuse the user).
	const autoSave = useAutoSave({
		enabled: () => formStore.fields.status === 'draft' && formStore.fields.title.trim() !== '',
		isDirty: () => isDirty,
		save: () => handleSave(formStore.fields.status, { silent: true })
	})

	const autoSaveLabel = $derived.by(() => {
		switch (autoSave.state) {
			case 'saving':
				return 'Saving…'
			case 'unsaved':
				return 'Unsaved'
			case 'failed':
				return 'Save failed'
			case 'conflict':
				return 'Conflict — reload'
			case 'saved':
			case 'idle':
			default:
				return 'Saved'
		}
	})

	// Initial load effect
	$effect(() => {
		if (project && mode === 'edit' && !hasLoaded) {
			formStore.populateFromProject(project)
			savedSnapshot = snapshot()
			isLoading = false
			hasLoaded = true
		}
	})

	// Cmd+S keyboard shortcut. For drafts: flush the auto-save debounce. For other statuses: trigger save directly.
	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
				e.preventDefault()
				if (formStore.fields.status === 'draft') {
					autoSave.flush().catch(() => {})
				} else {
					handleSave()
				}
			}
		}
		document.addEventListener('keydown', handleKeydown)
		return () => document.removeEventListener('keydown', handleKeydown)
	})

	// Flush pending auto-save when the window loses focus (matches Notion's behavior).
	$effect(() => {
		function handleBlur() {
			if (formStore.fields.status === 'draft') autoSave.flush().catch(() => {})
		}
		window.addEventListener('blur', handleBlur)
		return () => window.removeEventListener('blur', handleBlur)
	})

	// Browser warning for page unloads (refresh/close) - required for these events
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

	// Navigation guard for unsaved changes (in-app navigation only)
	beforeNavigate((navigation) => {
		if (allowNavigation) {
			allowNavigation = false
			return
		}
		if (!isDirty || navigation.type === 'leave' || !navigation.to) return

		const targetUrl = navigation.to.url.pathname

		// Drafts with content: try to flush auto-save silently, then continue. If the flush fails
		// (network, 409, etc), fall back to the unsaved-changes modal so we never drop edits silently.
		// If autosave isn't enabled (e.g. empty title gates it off), don't fall through to its silent
		// path — the form is still dirty in other fields and we'd drop those edits.
		const draftCanAutoSave =
			formStore.fields.status === 'draft' &&
			formStore.fields.title.trim() !== '' &&
			autoSave.state !== 'conflict'
		if (draftCanAutoSave) {
			navigation.cancel()
			autoSave.flush().then(
				() => {
					allowNavigation = true
					goto(targetUrl)
				},
				() => {
					pendingNavigation = navigation
					showUnsavedChangesModal = true
				}
			)
			return
		}

		// Published / list-only / password-protected / conflict: keep the existing unsaved-changes prompt.
		pendingNavigation = navigation
		navigation.cancel()
		showUnsavedChangesModal = true
	})

	async function handleSave(newStatus?: string, { silent = false } = {}) {
		const saveStatus = (newStatus as ProjectStatus) || formStore.fields.status

		// Strict validation only for explicit user-driven saves. Auto-save never blocks on validation —
		// the form may be partial; the next save attempt will pick up new fields when they're filled in.
		if (!silent && !formStore.validate()) {
			toast.error('Please fix the validation errors')
			return
		}

		// Snapshot what we're about to submit (with saveStatus, even though we haven't applied it
		// locally yet). Don't mutate formStore.fields.status here — if the save fails, we'd be lying
		// to the dropdown about what state the server has.
		const submittingSnapshot = JSON.stringify({ ...formStore.fields, status: saveStatus })

		isSaving = true
		const loadingToastId = silent
			? null
			: toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} project...`)

		try {
			const payload = {
				...formStore.buildPayload(),
				status: saveStatus,
				password: saveStatus === 'password-protected' ? formStore.fields.password : null,
				// Include updatedAt for concurrency control in edit mode
				updatedAt: mode === 'edit' ? project?.updatedAt : undefined
			}

			let savedProject: Project
			if (mode === 'edit') {
				savedProject = (await api.put(`/api/projects/${project?.id}`, payload)) as Project
			} else {
				savedProject = (await api.post('/api/projects', payload)) as Project
			}

			if (loadingToastId) {
				toast.dismiss(loadingToastId)
				toast.success(`Project ${mode === 'edit' ? 'saved' : 'created'} successfully!`)
			}

			// Sync the local project handle so subsequent saves carry the right updatedAt + viewUrl uses
			// the new slug. Don't call formStore.populateFromProject here — that would clobber any
			// keystrokes the user made during the await.
			project = savedProject

			// Apply the status transition only after the server has accepted it.
			formStore.setField('status', saveStatus)

			// Mark the version we actually submitted as saved. Mid-await keystrokes diverge from this
			// snapshot, so isDirty stays true and the next debounce flushes them.
			savedSnapshot = submittingSnapshot

			if (mode === 'create') {
				mode = 'edit'
				replaceState(`/admin/projects/${savedProject.id}/edit`, {})
			}
		} catch (err) {
			if (loadingToastId) toast.dismiss(loadingToastId)
			const errStatus =
				err && typeof err === 'object' && 'status' in err
					? (err as { status: number }).status
					: undefined
			if (errStatus !== 409 && !silent) {
				toast.error(`Failed to ${mode === 'edit' ? 'save' : 'create'} project`)
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

	function handleContinueEditing() {
		showUnsavedChangesModal = false
		pendingNavigation = null
	}

	function handleLeaveWithoutSaving() {
		showUnsavedChangesModal = false
		const nav = pendingNavigation
		pendingNavigation = null
		// Mark current state as saved so we don't re-trigger the modal on the next navigation.
		savedSnapshot = snapshot()
		if (nav?.to) {
			allowNavigation = true
			goto(nav.to.url.pathname)
		}
	}
</script>

<AdminPage>
	{#snippet header()}
		<header>
			<div class="header-left">
				<h1 class="form-title">{formStore.fields.title || 'Untitled Project'}</h1>
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
					status={formStore.fields.status}
					onSave={(target) => {
						if (formStore.fields.status === 'draft' && target !== 'draft' && isDirty) {
							autoSave.flush().then(
								() => handleSave(target),
								() => {
									/* autoSave already surfaced the failure via its trigger label */
								}
							)
						} else {
							handleSave(target)
						}
					}}
					disabled={isSaving}
					isLoading={isSaving}
					triggerText={formStore.fields.status === 'draft' ? autoSaveLabel : undefined}
					{primaryLabel}
					{altActions}
					{viewUrl}
				/>
			</div>
		</header>
	{/snippet}

	<div class="admin-container">
		{#if isLoading}
			<div class="loading">Loading project...</div>
		{:else}
			<div class="tab-panels">
				<!-- Metadata Panel -->
				<div class="panel content-wrapper" class:active={activeTab === 'metadata'}>
					<div class="form-content">
						<form
							onsubmit={(e) => {
								e.preventDefault()
								handleSave()
							}}
						>
							<ProjectMetadataForm
								bind:formData={formStore.fields}
								validationErrors={formStore.validationErrors}
								contentId={project?.id}
							/>
						</form>
					</div>
				</div>

				<!-- Branding Panel -->
				<div class="panel content-wrapper" class:active={activeTab === 'branding'}>
					<div class="form-content">
						<form
							onsubmit={(e) => {
								e.preventDefault()
								handleSave()
							}}
						>
							<ProjectBrandingForm
								bind:formData={formStore.fields}
								validationErrors={formStore.validationErrors}
							/>
						</form>
					</div>
				</div>

				<!-- Case Study Panel -->
				<div class="panel panel-case-study" class:active={activeTab === 'case-study'}>
					<Composer
						bind:data={formStore.fields.caseStudyContent}
						placeholder="Write your case study here..."
						minHeight={400}
						autofocus={false}
						variant="full"
					/>
				</div>
			</div>
		{/if}
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

	.loading {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
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

	.panel-case-study {
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
