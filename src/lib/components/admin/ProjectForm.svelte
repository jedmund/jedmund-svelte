<script lang="ts">
	import { goto } from '$app/navigation'
	import { z } from 'zod'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import FormField from './FormField.svelte'
	import Composer from './composer'
	import ProjectMetadataForm from './ProjectMetadataForm.svelte'
	import ProjectBrandingForm from './ProjectBrandingForm.svelte'
	import ProjectImagesForm from './ProjectImagesForm.svelte'
	import Button from './Button.svelte'
	import StatusDropdown from './StatusDropdown.svelte'
	import { projectSchema } from '$lib/schemas/project'
	import { toast } from '$lib/stores/toast'
	import type { Project, ProjectFormData } from '$lib/types/project'
	import { defaultProjectFormData } from '$lib/types/project'
  import { beforeNavigate } from '$app/navigation'
  import { createAutoSaveController } from '$lib/admin/autoSave'
  import AutoSaveStatus from './AutoSaveStatus.svelte'
  import { makeDraftKey, saveDraft, loadDraft, clearDraft, timeAgo } from '$lib/admin/draftStore'

	interface Props {
		project?: Project | null
		mode: 'create' | 'edit'
	}

	let { project = null, mode }: Props = $props()

	// State
	let isLoading = $state(mode === 'edit')
	let isSaving = $state(false)
	let activeTab = $state('metadata')
	let validationErrors = $state<Record<string, string>>({})
	let error = $state<string | null>(null)
	let successMessage = $state<string | null>(null)

	// Form data
	let formData = $state<ProjectFormData>({ ...defaultProjectFormData })

	// Ref to the editor component
	let editorRef: any

	// Local draft recovery
	const draftKey = $derived(mode === 'edit' && project ? makeDraftKey('project', project.id) : null)
	let showDraftPrompt = $state(false)
	let draftTimestamp = $state<number | null>(null)
	let timeTicker = $state(0)
	const draftTimeText = $derived(() => (draftTimestamp ? (timeTicker, timeAgo(draftTimestamp)) : null))

	function buildPayload() {
		return {
			title: formData.title,
			subtitle: formData.subtitle,
			description: formData.description,
			year: formData.year,
			client: formData.client,
			role: formData.role,
			projectType: formData.projectType,
			externalUrl: formData.externalUrl,
			featuredImage: formData.featuredImage && formData.featuredImage !== '' ? formData.featuredImage : null,
			logoUrl: formData.logoUrl && formData.logoUrl !== '' ? formData.logoUrl : null,
			backgroundColor: formData.backgroundColor,
			highlightColor: formData.highlightColor,
			status: formData.status,
			password: formData.status === 'password-protected' ? formData.password : null,
			caseStudyContent:
				formData.caseStudyContent &&
				formData.caseStudyContent.content &&
				formData.caseStudyContent.content.length > 0
					? formData.caseStudyContent
					: null,
			updatedAt: project?.updatedAt
		}
	}

	// Autosave (edit mode only)
	let autoSave = mode === 'edit'
		? createAutoSaveController({
			debounceMs: 2000,
			getPayload: () => (isLoading ? null : buildPayload()),
			save: async (payload, { signal }) => {
				return await api.put(`/api/projects/${project?.id}`, payload, { signal })
			},
			onSaved: (savedProject: any) => {
				// Update baseline updatedAt on successful save
				project = savedProject
				if (draftKey) clearDraft(draftKey)
			}
		})
		: null

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'case-study', label: 'Case Study' }
	]

	// Watch for project changes and populate form data
	$effect(() => {
		if (project && mode === 'edit') {
			populateFormData(project)
		} else if (mode === 'create') {
			isLoading = false
		}
	})

	// Check for local draft to restore
	$effect(() => {
		if (mode === 'edit' && project && draftKey) {
			const draft = loadDraft<any>(draftKey)
			if (draft) {
				// Show prompt; restoration is manual to avoid overwriting loaded data unintentionally
				showDraftPrompt = true
				draftTimestamp = draft.ts
			}
		}
	})

	// Auto-update draft time text every minute when prompt visible
	$effect(() => {
		if (showDraftPrompt) {
			const id = setInterval(() => (timeTicker = timeTicker + 1), 60000)
			return () => clearInterval(id)
		}
	})

	function restoreDraft() {
		if (!draftKey) return
		const draft = loadDraft<any>(draftKey)
		if (!draft) return
		const p = draft.payload
		// Apply payload fields to formData
		formData = {
			title: p.title ?? formData.title,
			subtitle: p.subtitle ?? formData.subtitle,
			description: p.description ?? formData.description,
			year: p.year ?? formData.year,
			client: p.client ?? formData.client,
			role: p.role ?? formData.role,
			projectType: p.projectType ?? formData.projectType,
			externalUrl: p.externalUrl ?? formData.externalUrl,
			featuredImage: p.featuredImage ?? formData.featuredImage,
			logoUrl: p.logoUrl ?? formData.logoUrl,
			backgroundColor: p.backgroundColor ?? formData.backgroundColor,
			highlightColor: p.highlightColor ?? formData.highlightColor,
			status: p.status ?? formData.status,
			password: p.password ?? formData.password,
			caseStudyContent: p.caseStudyContent ?? formData.caseStudyContent
		}
		showDraftPrompt = false
	}

	function dismissDraft() {
		showDraftPrompt = false
	}

	// Trigger autosave and store local draft when formData changes (edit mode)
	$effect(() => {
		// Establish dependencies on fields
		formData; activeTab
		if (mode === 'edit' && !isLoading && autoSave) {
			autoSave.schedule()
			if (draftKey) saveDraft(draftKey, buildPayload())
		}
	})

	function populateFormData(data: Project) {
		formData = {
			title: data.title || '',
			subtitle: data.subtitle || '',
			description: data.description || '',
			year: data.year || new Date().getFullYear(),
			client: data.client || '',
			role: data.role || '',
			projectType: data.projectType || 'work',
			externalUrl: data.externalUrl || '',
			featuredImage:
				data.featuredImage && data.featuredImage.trim() !== '' ? data.featuredImage : null,
			backgroundColor: data.backgroundColor || '',
			highlightColor: data.highlightColor || '',
			logoUrl: data.logoUrl && data.logoUrl.trim() !== '' ? data.logoUrl : '',
			status: data.status || 'draft',
			password: data.password || '',
			caseStudyContent: data.caseStudyContent || {
				type: 'doc',
				content: [{ type: 'paragraph' }]
			}
		}
		isLoading = false
	}

	function validateForm() {
		try {
			projectSchema.parse({
				title: formData.title,
				description: formData.description || undefined,
				year: formData.year,
				client: formData.client || undefined,
				externalUrl: formData.externalUrl || undefined,
				backgroundColor: formData.backgroundColor || undefined,
				highlightColor: formData.highlightColor || undefined,
				status: formData.status,
				password: formData.password || undefined
			})
			validationErrors = {}
			return true
		} catch (err) {
			if (err instanceof z.ZodError) {
				const errors: Record<string, string> = {}
				err.errors.forEach((e) => {
					if (e.path[0]) {
						errors[e.path[0].toString()] = e.message
					}
				})
				validationErrors = errors
			}
			return false
		}
	}

	function handleEditorChange(content: any) {
		formData.caseStudyContent = content
	}

	import { api } from '$lib/admin/api'

	async function handleSave() {
		// Check if we're on the case study tab and should save editor content
		if (activeTab === 'case-study' && editorRef) {
			const editorData = await editorRef.save()
			if (editorData) {
				formData.caseStudyContent = editorData
			}
		}

		if (!validateForm()) {
			toast.error('Please fix the validation errors')
			return
		}

		const loadingToastId = toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} project...`)

		try {
			isSaving = true

			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const payload = {
				title: formData.title,
				subtitle: formData.subtitle,
				description: formData.description,
				year: formData.year,
				client: formData.client,
				role: formData.role,
				projectType: formData.projectType,
				externalUrl: formData.externalUrl,
				featuredImage:
					formData.featuredImage && formData.featuredImage !== '' ? formData.featuredImage : null,
				logoUrl: formData.logoUrl && formData.logoUrl !== '' ? formData.logoUrl : null,
				backgroundColor: formData.backgroundColor,
				highlightColor: formData.highlightColor,
				status: formData.status,
				password: formData.status === 'password-protected' ? formData.password : null,
				caseStudyContent:
					formData.caseStudyContent &&
					formData.caseStudyContent.content &&
					formData.caseStudyContent.content.length > 0
						? formData.caseStudyContent
						: null
				,
				// Include updatedAt for concurrency control in edit mode
				updatedAt: mode === 'edit' ? project?.updatedAt : undefined
			}

			let savedProject
			if (mode === 'edit') {
				savedProject = await api.put(`/api/projects/${project?.id}`, payload)
			} else {
				savedProject = await api.post('/api/projects', payload)
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
			if ((err as any)?.status === 409) {
				toast.error('This project has changed in another tab. Please reload.')
			} else {
				toast.error(`Failed to ${mode === 'edit' ? 'save' : 'create'} project`)
			}
			console.error(err)
		} finally {
			isSaving = false
		}
	}

	async function handleStatusChange(newStatus: string) {
		formData.status = newStatus as any
		await handleSave()
	}

	// Keyboard shortcut: Cmd/Ctrl+S flushes autosave
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault()
			if (mode === 'edit' && autoSave) autoSave.flush()
		}
	}

	$effect(() => {
		if (mode === 'edit') {
			document.addEventListener('keydown', handleKeydown)
			return () => document.removeEventListener('keydown', handleKeydown)
		}
	})

	// Flush before navigating away
	beforeNavigate(() => {
		if (mode === 'edit' && autoSave) autoSave.flush()
	})
</script>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<button class="btn-icon" onclick={() => goto('/admin/projects')}>
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
		</div>
		<div class="header-center">
			<AdminSegmentedControl
				options={tabOptions}
				value={activeTab}
				onChange={(value) => (activeTab = value)}
			/>
		</div>
		<div class="header-actions">
			{#if !isLoading}
				<StatusDropdown
					currentStatus={formData.status}
					onStatusChange={handleStatusChange}
					disabled={isSaving}
					isLoading={isSaving}
					primaryAction={formData.status === 'published'
						? { label: 'Save', status: 'published' }
						: { label: 'Publish', status: 'published' }}
					dropdownActions={[
						{ label: 'Save as Draft', status: 'draft', show: formData.status !== 'draft' },
						{ label: 'List Only', status: 'list-only', show: formData.status !== 'list-only' },
						{
							label: 'Password Protected',
							status: 'password-protected',
							show: formData.status !== 'password-protected'
						}
					]}
					viewUrl={project?.slug ? `/work/${project.slug}` : undefined}
				/>
				{#if mode === 'edit' && autoSave}
					<AutoSaveStatus statusStore={autoSave.status} errorStore={autoSave.lastError} />
				{/if}
			{#if mode === 'edit' && showDraftPrompt}
				<div class="draft-prompt">
					Unsaved draft found{#if draftTimeText} (saved {draftTimeText}){/if}.
					<button class="link" onclick={restoreDraft}>Restore</button>
					<button class="link" onclick={dismissDraft}>Dismiss</button>
				</div>
			{/if}
			{/if}
		</div>
	</header>

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
							<ProjectMetadataForm bind:formData {validationErrors} onSave={handleSave} />
							<ProjectBrandingForm bind:formData {validationErrors} onSave={handleSave} />
							<ProjectImagesForm bind:formData {validationErrors} onSave={handleSave} />
						</form>
					</div>
				</div>

				<!-- Case Study Panel -->
				<div class="panel panel-case-study" class:active={activeTab === 'case-study'}>
					<Composer
						bind:this={editorRef}
						bind:data={formData.caseStudyContent}
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

	.draft-prompt {
		margin-left: $unit-2x;
		color: $gray-40;
		font-size: 0.75rem;

		.button, .link {
			background: none;
			border: none;
			color: $gray-20;
			cursor: pointer;
			margin-left: $unit;
			padding: 0;
		}
	}
</style>
