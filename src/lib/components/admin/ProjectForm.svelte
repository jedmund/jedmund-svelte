<script lang="ts">
	import { goto } from '$app/navigation'
	import { api } from '$lib/admin/api'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import Composer from './composer'
	import ProjectMetadataForm from './ProjectMetadataForm.svelte'
	import ProjectBrandingForm from './ProjectBrandingForm.svelte'
	import AutoSaveStatus from './AutoSaveStatus.svelte'
	import DraftPrompt from './DraftPrompt.svelte'
	import { toast } from '$lib/stores/toast'
	import type { Project } from '$lib/types/project'
	import { createAutoSaveStore } from '$lib/admin/autoSave.svelte'
	import { createProjectFormStore } from '$lib/stores/project-form.svelte'
	import { useDraftRecovery } from '$lib/admin/useDraftRecovery.svelte'
	import { useFormGuards } from '$lib/admin/useFormGuards.svelte'
	import { makeDraftKey, saveDraft, clearDraft } from '$lib/admin/draftStore'
	import type { ProjectFormData } from '$lib/types/project'
	import type { JSONContent } from '@tiptap/core'

	interface Props {
		project?: Project | null
		mode: 'create' | 'edit'
	}

	let { project = null, mode }: Props = $props()

	// Form store - centralized state management
	const formStore = createProjectFormStore(project)

	// UI state
	let isLoading = $state(mode === 'edit')
	let hasLoaded = $state(mode === 'create')
	let activeTab = $state('metadata')
	let error = $state<string | null>(null)
	let successMessage = $state<string | null>(null)

	// Ref to the editor component
	let editorRef: { save: () => Promise<JSONContent> } | undefined = $state.raw()

	// Draft key for autosave fallback
	const draftKey = $derived(mode === 'edit' && project ? makeDraftKey('project', project.id) : null)

	// Autosave (edit mode only)
	const autoSave = mode === 'edit'
		? createAutoSaveStore({
			debounceMs: 2000,
			getPayload: () => (hasLoaded ? formStore.buildPayload() : null),
			save: async (payload, { signal }) => {
				return await api.put(`/api/projects/${project?.id}`, payload, { signal })
			},
			onSaved: (savedProject: Project, { prime }) => {
				project = savedProject
				formStore.populateFromProject(savedProject)
				prime(formStore.buildPayload())
				if (draftKey) clearDraft(draftKey)
			}
		})
		: null

	// Draft recovery helper
	const draftRecovery = useDraftRecovery<Partial<ProjectFormData>>({
		draftKey: () => draftKey,
		onRestore: (payload) => formStore.setFields(payload)
	})

	// Form guards (navigation protection, Cmd+S, beforeunload)
	useFormGuards(autoSave)

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'branding', label: 'Branding' },
		{ value: 'case-study', label: 'Case Study' }
	]

	// Initial load effect
	$effect(() => {
		if (project && mode === 'edit' && !hasLoaded) {
			formStore.populateFromProject(project)
			if (autoSave) {
				autoSave.prime(formStore.buildPayload())
			}
			isLoading = false
			hasLoaded = true
		}
	})

	// Trigger autosave when formData changes (edit mode)
	$effect(() => {
		// Establish dependencies on fields
		void formStore.fields; void activeTab
		if (mode === 'edit' && hasLoaded && autoSave) {
			autoSave.schedule()
		}
	})

	// Save draft only when autosave fails
	$effect(() => {
		if (mode === 'edit' && autoSave && draftKey) {
			const status = autoSave.status
			if (status === 'error' || status === 'offline') {
				saveDraft(draftKey, formStore.buildPayload())
			}
		}
	})

	// Cleanup autosave on unmount
	$effect(() => {
		if (autoSave) {
			return () => autoSave.destroy()
		}
	})

	function handleEditorChange(content: JSONContent) {
		formStore.setField('caseStudyContent', content)
	}

	async function handleSave() {
		// Check if we're on the case study tab and should save editor content
		if (activeTab === 'case-study' && editorRef) {
			const editorData = await editorRef.save()
			if (editorData) {
				formStore.setField('caseStudyContent', editorData)
			}
		}

		if (!formStore.validate()) {
			toast.error('Please fix the validation errors')
			return
		}

		const loadingToastId = toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} project...`)

		try {
			const payload = {
				...formStore.buildPayload(),
				// Include updatedAt for concurrency control in edit mode
				updatedAt: mode === 'edit' ? project?.updatedAt : undefined
			}

			let savedProject: Project
			if (mode === 'edit') {
				savedProject = await api.put(`/api/projects/${project?.id}`, payload) as Project
			} else {
				savedProject = await api.post('/api/projects', payload) as Project
			}

			toast.dismiss(loadingToastId)
			toast.success(`Project ${mode === 'edit' ? 'saved' : 'created'} successfully!`)

			if (mode === 'create') {
				goto(`/admin/projects/${savedProject.id}/edit`)
			} else {
				project = savedProject
			}
		} catch (err) {
			toast.dismiss(loadingToastId)
			if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 409) {
				toast.error('This project has changed in another tab. Please reload.')
			} else {
				toast.error(`Failed to ${mode === 'edit' ? 'save' : 'create'} project`)
			}
			console.error(err)
		}
	}


</script>

<AdminPage>
	<header slot="header">
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
			{#if !isLoading && mode === 'edit' && autoSave}
				<AutoSaveStatus
					status={autoSave.status}
					error={autoSave.lastError}
					lastSavedAt={project?.updatedAt}
				/>
			{/if}
		</div>
	</header>

	{#if draftRecovery.showPrompt}
		<DraftPrompt
			timeAgo={draftRecovery.draftTimeText}
			onRestore={draftRecovery.restore}
			onDismiss={draftRecovery.dismiss}
		/>
	{/if}

	<div class="admin-container">
		{#if isLoading}
			<div class="loading">Loading project...</div>
		{:else}
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			{#if successMessage}
				<div class="success-message">{successMessage}</div>
			{/if}

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
							<ProjectMetadataForm bind:formData={formStore.fields} validationErrors={formStore.validationErrors} onSave={handleSave} />
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
							<ProjectBrandingForm bind:formData={formStore.fields} validationErrors={formStore.validationErrors} onSave={handleSave} />
						</form>
					</div>
				</div>

				<!-- Case Study Panel -->
				<div class="panel panel-case-study" class:active={activeTab === 'case-study'}>
					<Composer
						bind:this={editorRef}
						bind:data={formStore.fields.caseStudyContent}
						onChange={handleEditorChange}
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

	.btn-icon {
		width: 40px;
		height: 40px;
		border: none;
		background: none;
		color: $gray-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-90;
			color: $gray-10;
		}
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

	.loading,
	.error {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
	}

	.error {
		color: #d33;
	}

	.error-message,
	.success-message {
		padding: $unit-3x;
		border-radius: $unit;
		margin-bottom: $unit-4x;
		max-width: 700px;
		margin-left: auto;
		margin-right: auto;
	}

	.error-message {
		background-color: #fee;
		color: #d33;
	}

	.success-message {
		background-color: #efe;
		color: #363;
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
