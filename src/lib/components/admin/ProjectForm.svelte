<script lang="ts">
	import { goto } from '$app/navigation'
	import { z } from 'zod'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import FormFieldWrapper from './FormFieldWrapper.svelte'
	import Editor from './Editor.svelte'
	import ProjectMetadataForm from './ProjectMetadataForm.svelte'
	import ProjectBrandingForm from './ProjectBrandingForm.svelte'
	import ProjectGalleryForm from './ProjectGalleryForm.svelte'
	import ProjectStylingForm from './ProjectStylingForm.svelte'
	import Button from './Button.svelte'
	import { projectSchema } from '$lib/schemas/project'
	import type { Project, ProjectFormData } from '$lib/types/project'
	import { defaultProjectFormData } from '$lib/types/project'

	interface Props {
		project?: Project | null
		mode: 'create' | 'edit'
	}

	let { project = null, mode }: Props = $props()

	// State
	let isLoading = $state(mode === 'edit')
	let isSaving = $state(false)
	let error = $state('')
	let successMessage = $state('')
	let activeTab = $state('metadata')
	let validationErrors = $state<Record<string, string>>({})
	let showPublishMenu = $state(false)

	// Form data
	let formData = $state<ProjectFormData>({ ...defaultProjectFormData })

	// Ref to the editor component
	let editorRef: any

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
			featuredImage: data.featuredImage || null,
			backgroundColor: data.backgroundColor || '',
			highlightColor: data.highlightColor || '',
			logoUrl: data.logoUrl || '',
			gallery: data.gallery || null,
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


	async function handleSave() {
		// Check if we're on the case study tab and should save editor content
		if (activeTab === 'case-study' && editorRef) {
			const editorData = await editorRef.save()
			if (editorData) {
				formData.caseStudyContent = editorData
			}
		}

		if (!validateForm()) {
			error = 'Please fix the validation errors'
			return
		}

		try {
			isSaving = true
			error = ''
			successMessage = ''

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
				featuredImage: formData.featuredImage,
				logoUrl: formData.logoUrl,
				gallery: formData.gallery && formData.gallery.length > 0 ? formData.gallery : null,
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
			}

			const url = mode === 'edit' ? `/api/projects/${project?.id}` : '/api/projects'
			const method = mode === 'edit' ? 'PUT' : 'POST'

			const response = await fetch(url, {
				method,
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			})

			if (!response.ok) {
				throw new Error(`Failed to ${mode === 'edit' ? 'save' : 'create'} project`)
			}

			const savedProject = await response.json()
			successMessage = `Project ${mode === 'edit' ? 'saved' : 'created'} successfully!`

			setTimeout(() => {
				successMessage = ''
				if (mode === 'create') {
					goto(`/admin/projects/${savedProject.id}/edit`)
				}
			}, 1500)
		} catch (err) {
			error = `Failed to ${mode === 'edit' ? 'save' : 'create'} project`
			console.error(err)
		} finally {
			isSaving = false
		}
	}

	async function handleStatusChange(newStatus: string) {
		formData.status = newStatus as any
		await handleSave()
		showPublishMenu = false
	}

	function togglePublishMenu() {
		showPublishMenu = !showPublishMenu
	}

	// Close menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.save-actions')) {
			showPublishMenu = false
		}
	}

	$effect(() => {
		if (showPublishMenu) {
			document.addEventListener('click', handleClickOutside)
			return () => {
				document.removeEventListener('click', handleClickOutside)
			}
		}
	})
</script>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<!-- Empty spacer for balance -->
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
				<div class="save-actions">
					<Button variant="primary" onclick={handleSave} disabled={isSaving} class="save-button">
						{isSaving ? 'Saving...' : 
						 formData.status === 'published' ? 'Save' :
						 formData.status === 'list-only' ? 'Save List-Only' :
						 formData.status === 'password-protected' ? 'Save Protected' :
						 'Save Draft'}
					</Button>
					<Button
						variant="ghost"
						iconOnly
						size="medium"
						active={showPublishMenu}
						onclick={togglePublishMenu}
						disabled={isSaving}
						class="chevron-button"
					>
						<svg
							slot="icon"
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M3 4.5L6 7.5L9 4.5"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</Button>
					{#if showPublishMenu}
						<div class="publish-menu">
							{#if formData.status !== 'draft'}
								<Button variant="ghost" onclick={() => handleStatusChange('draft')} class="menu-item" fullWidth>
									Save as Draft
								</Button>
							{/if}
							{#if formData.status !== 'published'}
								<Button variant="ghost" onclick={() => handleStatusChange('published')} class="menu-item" fullWidth>
									Publish
								</Button>
							{/if}
							{#if formData.status !== 'list-only'}
								<Button variant="ghost" onclick={() => handleStatusChange('list-only')} class="menu-item" fullWidth>
									List Only
								</Button>
							{/if}
							{#if formData.status !== 'password-protected'}
								<Button variant="ghost" onclick={() => handleStatusChange('password-protected')} class="menu-item" fullWidth>
									Password Protected
								</Button>
							{/if}
						</div>
					{/if}
				</div>
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
							<ProjectMetadataForm bind:formData {validationErrors} />
							<ProjectBrandingForm bind:formData />
							<ProjectGalleryForm bind:formData />
							<ProjectStylingForm bind:formData {validationErrors} />
						</form>
					</div>
				</div>

				<!-- Case Study Panel -->
				<div class="panel case-study-wrapper" class:active={activeTab === 'case-study'}>
					<div class="editor-content">
						<Editor
							bind:this={editorRef}
							bind:data={formData.caseStudyContent}
							onChange={handleEditorChange}
							placeholder="Write your case study here..."
							minHeight={400}
							autofocus={false}
							class="case-study-editor"
						/>
					</div>
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

	.save-actions {
		position: relative;
		display: flex;
		gap: $unit-half;
	}

	/* Button-specific styles handled by Button component */

	/* Custom button styles */
	:global(.save-button) {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		padding-right: $unit-2x;
	}

	:global(.chevron-button) {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		border-left: 1px solid rgba(255, 255, 255, 0.2);

		svg {
			display: block;
			transition: transform 0.2s ease;
		}

		&.active svg {
			transform: rotate(180deg);
		}
	}

	.publish-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: $unit;
		background: white;
		border-radius: $unit;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		min-width: 120px;
		z-index: 100;

		/* Menu item styles handled by Button component */
		:global(.menu-item) {
			text-align: left;
			justify-content: flex-start;
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
		color: $grey-40;
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

	.case-study-wrapper {
		background: white;
		padding: 0;
		min-height: 80vh;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;

		@include breakpoint('phone') {
			height: 600px;
		}
	}

	.editor-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;

		/* The editor component will handle its own padding and scrolling */
		:global(.case-study-editor) {
			flex: 1;
			overflow: auto;
		}
	}
</style>
