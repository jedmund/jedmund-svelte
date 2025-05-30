<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { z } from 'zod'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import FormFieldWrapper from './FormFieldWrapper.svelte'
	import Editor from './Editor.svelte'
	import ProjectMetadataForm from './ProjectMetadataForm.svelte'
	import ProjectBrandingForm from './ProjectBrandingForm.svelte'
	import ProjectStylingForm from './ProjectStylingForm.svelte'
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
	let logoUploadInProgress = $state(false)

	// Ref to the editor component
	let editorRef: any

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'case-study', label: 'Case Study' }
	]

	onMount(() => {
		if (project) {
			populateFormData(project)
		}
		if (mode === 'create') {
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
			technologies: Array.isArray(data.technologies) ? data.technologies.join(', ') : '',
			externalUrl: data.externalUrl || '',
			backgroundColor: data.backgroundColor || '',
			highlightColor: data.highlightColor || '',
			logoUrl: data.logoUrl || '',
			status: (data.status as 'draft' | 'published') || 'draft',
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
				status: formData.status
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

	async function handleLogoUpload(event: Event) {
		const input = event.target as HTMLInputElement
		const file = input.files?.[0]
		
		if (!file) return
		
		// Check if it's an SVG
		if (file.type !== 'image/svg+xml') {
			error = 'Please upload an SVG file'
			return
		}
		
		// Check file size (500KB max for SVG)
		const filesize = file.size / 1024 / 1024
		if (filesize > 0.5) {
			error = `Logo file too large! File size: ${filesize.toFixed(2)} MB (max 0.5MB)`
			return
		}
		
		try {
			logoUploadInProgress = true
			error = ''
			
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}
			
			const uploadFormData = new FormData()
			uploadFormData.append('file', file)
			
			const response = await fetch('/api/media/upload', {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`
				},
				body: uploadFormData
			})
			
			if (!response.ok) {
				throw new Error('Upload failed')
			}
			
			const media = await response.json()
			formData.logoUrl = media.url
			successMessage = 'Logo uploaded successfully!'
			
			setTimeout(() => {
				successMessage = ''
			}, 3000)
		} catch (err) {
			error = 'Failed to upload logo'
			console.error(err)
		} finally {
			logoUploadInProgress = false
		}
	}

	function removeLogo() {
		formData.logoUrl = ''
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
				technologies: formData.technologies
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean),
				externalUrl: formData.externalUrl,
				logoUrl: formData.logoUrl,
				backgroundColor: formData.backgroundColor,
				highlightColor: formData.highlightColor,
				status: formData.status,
				caseStudyContent:
					formData.caseStudyContent && formData.caseStudyContent.content && formData.caseStudyContent.content.length > 0
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

	async function handlePublish() {
		formData.status = 'published'
		await handleSave()
		showPublishMenu = false
	}

	async function handleUnpublish() {
		formData.status = 'draft'
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
					<button onclick={handleSave} disabled={isSaving} class="btn btn-primary save-button">
						{isSaving ? 'Saving...' : formData.status === 'published' ? 'Save' : 'Save Draft'}
					</button>
					<button
						class="btn btn-primary chevron-button"
						class:active={showPublishMenu}
						onclick={togglePublishMenu}
						disabled={isSaving}
					>
						<svg
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
					</button>
					{#if showPublishMenu}
						<div class="publish-menu">
							{#if formData.status === 'published'}
								<button onclick={handleUnpublish} class="menu-item"> Unpublish </button>
							{:else}
								<button onclick={handlePublish} class="menu-item"> Publish </button>
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
							<ProjectBrandingForm 
								bind:formData 
								bind:logoUploadInProgress
								onLogoUpload={handleLogoUpload}
								onRemoveLogo={removeLogo}
							/>
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
	}

	.btn {
		padding: $unit $unit-3x;
		border-radius: 50px;
		text-decoration: none;
		font-size: 0.925rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		&.btn-primary {
			background-color: $grey-10;
			color: white;

			&:hover:not(:disabled) {
				background-color: $grey-20;
			}
		}
	}

	.save-button {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		padding-right: $unit-2x;
	}

	.chevron-button {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		padding: $unit $unit;
		border-left: 1px solid rgba(255, 255, 255, 0.2);

		&.active {
			background-color: $grey-20;
		}

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

		.menu-item {
			display: block;
			width: 100%;
			padding: $unit-2x $unit-3x;
			text-align: left;
			background: none;
			border: none;
			font-size: 0.925rem;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
			color: $grey-10;
			cursor: pointer;
			transition: background-color 0.2s ease;

			&:hover {
				background-color: $grey-95;
			}
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
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}

	.error {
		color: #d33;
	}

	.error-message,
	.success-message {
		padding: $unit-3x;
		border-radius: $unit;
		margin-bottom: $unit-4x;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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