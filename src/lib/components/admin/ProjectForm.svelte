<script lang="ts">
	import { goto } from '$app/navigation'
	import { api } from '$lib/admin/api'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import Button from './Button.svelte'
	import Composer from './composer'
	import ProjectMetadataForm from './ProjectMetadataForm.svelte'
	import ProjectBrandingForm from './ProjectBrandingForm.svelte'
	import { toast } from '$lib/stores/toast'
	import type { Project } from '$lib/types/project'
	import { createProjectFormStore } from '$lib/stores/project-form.svelte'
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
	let isSaving = $state(false)
	let activeTab = $state('metadata')

	// Ref to the editor component
	let editorRef: { save: () => Promise<JSONContent> } | undefined = $state.raw()

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'branding', label: 'Branding' },
		{ value: 'case-study', label: 'Case Study' }
	]

	// Initial load effect
	$effect(() => {
		if (project && mode === 'edit' && !hasLoaded) {
			formStore.populateFromProject(project)
			isLoading = false
			hasLoaded = true
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

		isSaving = true
		const loadingToastId = toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} project...`)

		try {
			const payload = {
				...formStore.buildPayload(),
				// Include updatedAt for concurrency control in edit mode
				updatedAt: mode === 'edit' ? project?.updatedAt : undefined
			}

			console.log('[ProjectForm] Saving with payload:', {
				showFeaturedImageInHeader: payload.showFeaturedImageInHeader,
				showBackgroundColorInHeader: payload.showBackgroundColorInHeader,
				showLogoInHeader: payload.showLogoInHeader
			})

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
				formStore.populateFromProject(savedProject)
			}
		} catch (err) {
			toast.dismiss(loadingToastId)
			if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 409) {
				toast.error('This project has changed in another tab. Please reload.')
			} else {
				toast.error(`Failed to ${mode === 'edit' ? 'save' : 'create'} project`)
			}
			console.error(err)
		} finally {
			isSaving = false
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
			<Button
				variant="primary"
				onclick={handleSave}
				disabled={isSaving}
			>
				{isSaving ? 'Saving...' : 'Save'}
			</Button>
		</div>
	</header>

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
							<ProjectMetadataForm bind:formData={formStore.fields} validationErrors={formStore.validationErrors} />
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
							<ProjectBrandingForm bind:formData={formStore.fields} validationErrors={formStore.validationErrors} />
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
