<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { z } from 'zod'
	import AdminSegmentedControl from '$lib/components/admin/AdminSegmentedControl.svelte'
	import FormFieldWrapper from '$lib/components/admin/FormFieldWrapper.svelte'
	import Editor from '$lib/components/admin/Editor.svelte'

	// Zod schema for project validation
	const projectSchema = z.object({
		title: z.string().min(1, 'Title is required'),
		description: z.string().optional(),
		year: z
			.number()
			.min(1990)
			.max(new Date().getFullYear() + 1),
		client: z.string().optional(),
		externalUrl: z.string().url().optional().or(z.literal('')),
		backgroundColor: z
			.string()
			.regex(/^#[0-9A-Fa-f]{6}$/)
			.optional()
			.or(z.literal('')),
		highlightColor: z
			.string()
			.regex(/^#[0-9A-Fa-f]{6}$/)
			.optional()
			.or(z.literal('')),
		status: z.enum(['draft', 'published'])
	})

	interface Project {
		id: number
		slug: string
		title: string
		subtitle: string | null
		description: string | null
		year: number
		client: string | null
		role: string | null
		technologies: string[] | null
		featuredImage: string | null
		gallery: any[] | null
		externalUrl: string | null
		caseStudyContent: any | null
		backgroundColor: string | null
		highlightColor: string | null
		displayOrder: number
		status: string
	}

	// State
	let project = $state<Project | null>(null)
	let isLoading = $state(true)
	let isSaving = $state(false)
	let error = $state('')
	let successMessage = $state('')
	let activeTab = $state('metadata')
	let validationErrors = $state<Record<string, string>>({})
	let showPublishMenu = $state(false)

	// Form fields as individual state variables for reactivity
	let title = $state('')
	let subtitle = $state('') // Hidden but kept for backward compatibility
	let description = $state('')
	let year = $state(new Date().getFullYear())
	let client = $state('')
	let role = $state('') // Hidden but kept for backward compatibility
	let technologies = $state('') // Hidden but kept for backward compatibility
	let externalUrl = $state('')
	let backgroundColor = $state('')
	let highlightColor = $state('')
	let status = $state<'draft' | 'published'>('draft')
	let caseStudyContent = $state<any>({
		type: 'doc',
		content: [{ type: 'paragraph' }]
	})

	// Ref to the editor component
	let editorRef: any

	const projectId = $derived($page.params.id)

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'case-study', label: 'Case Study' }
	]

	onMount(async () => {
		await loadProject()
	})

	async function loadProject() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch(`/api/projects/${projectId}`, {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				throw new Error('Failed to load project')
			}

			const data = await response.json()
			project = data

			// Populate form fields
			title = data.title || ''
			subtitle = data.subtitle || ''
			description = data.description || ''
			year = data.year || new Date().getFullYear()
			client = data.client || ''
			role = data.role || ''
			technologies = Array.isArray(data.technologies) ? data.technologies.join(', ') : ''
			externalUrl = data.externalUrl || ''
			backgroundColor = data.backgroundColor || ''
			highlightColor = data.highlightColor || ''
			status = data.status || 'draft'

			if (data.caseStudyContent) {
				caseStudyContent = data.caseStudyContent
			}
		} catch (err) {
			error = 'Failed to load project'
			console.error(err)
		} finally {
			isLoading = false
		}
	}

	function validateForm() {
		try {
			projectSchema.parse({
				title,
				description: description || undefined,
				year,
				client: client || undefined,
				externalUrl: externalUrl || undefined,
				backgroundColor: backgroundColor || undefined,
				highlightColor: highlightColor || undefined,
				status
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
		caseStudyContent = content
	}

	async function handleSave() {
		// Check if we're on the case study tab and should save editor content
		if (activeTab === 'case-study' && editorRef) {
			const editorData = await editorRef.save()
			if (editorData) {
				caseStudyContent = editorData
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

			const response = await fetch(`/api/projects/${projectId}`, {
				method: 'PUT',
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title,
					subtitle,
					description,
					year,
					client,
					role,
					technologies: technologies
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean),
					externalUrl,
					backgroundColor,
					highlightColor,
					status,
					caseStudyContent:
						caseStudyContent && caseStudyContent.content && caseStudyContent.content.length > 0
							? caseStudyContent
							: null
				})
			})

			if (!response.ok) {
				throw new Error('Failed to save project')
			}

			successMessage = 'Project saved successfully!'

			setTimeout(() => {
				successMessage = ''
			}, 3000)
		} catch (err) {
			error = 'Failed to save project'
			console.error(err)
		} finally {
			isSaving = false
		}
	}

	async function handlePublish() {
		status = 'published'
		await handleSave()

		if (!error) {
			await loadProject()
		}
		showPublishMenu = false
	}

	async function handleUnpublish() {
		status = 'draft'
		await handleSave()

		if (!error) {
			await loadProject()
		}
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

	// Check for unsaved changes
	async function checkForUnsavedChanges() {
		if (editorRef && typeof editorRef.getIsDirty === 'function') {
			const isDirty = editorRef.getIsDirty()
			if (isDirty) {
				return confirm('You have unsaved changes. Are you sure you want to leave?')
			}
		}
		return true
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

<div class="admin-container">
	{#if isLoading}
		<div class="loading">Loading project...</div>
	{:else if !project}
		<div class="error">Project not found</div>
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
				<div class="controls-bar">
					<AdminSegmentedControl
						options={tabOptions}
						value={activeTab}
						onChange={(value) => (activeTab = value)}
					/>
					<div class="save-actions">
						<button onclick={handleSave} disabled={isSaving} class="btn btn-primary save-button">
							{isSaving ? 'Saving...' : status === 'published' ? 'Save' : 'Save Draft'}
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
								{#if status === 'published'}
									<button onclick={handleUnpublish} class="menu-item"> Unpublish </button>
								{:else}
									<button onclick={handlePublish} class="menu-item"> Publish </button>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<div class="form-content">
					<form
						onsubmit={(e) => {
							e.preventDefault()
							handleSave()
						}}
					>
						<div class="form-section">
							<FormFieldWrapper label="Title" required error={validationErrors.title}>
								<input type="text" bind:value={title} required placeholder="Project title" />
							</FormFieldWrapper>

							<FormFieldWrapper label="Description" error={validationErrors.description}>
								<textarea
									bind:value={description}
									rows="3"
									placeholder="Short description for project cards"
								/>
							</FormFieldWrapper>

							<div class="form-row">
								<FormFieldWrapper label="Year" required error={validationErrors.year}>
									<input
										type="number"
										bind:value={year}
										required
										min="1990"
										max={new Date().getFullYear() + 1}
									/>
								</FormFieldWrapper>

								<FormFieldWrapper label="Client" error={validationErrors.client}>
									<input type="text" bind:value={client} placeholder="Client or company name" />
								</FormFieldWrapper>
							</div>

							<FormFieldWrapper label="External URL" error={validationErrors.externalUrl}>
								<input type="url" bind:value={externalUrl} placeholder="https://example.com" />
							</FormFieldWrapper>
						</div>

						<div class="form-section">
							<h2>Styling</h2>

							<div class="form-row">
								<FormFieldWrapper
									label="Background Color"
									helpText="Hex color for project card"
									error={validationErrors.backgroundColor}
								>
									<div class="color-input-wrapper">
										<input
											type="text"
											bind:value={backgroundColor}
											placeholder="#FFFFFF"
											pattern="^#[0-9A-Fa-f]{6}$"
										/>
										{#if backgroundColor}
											<div class="color-preview" style="background-color: {backgroundColor}"></div>
										{/if}
									</div>
								</FormFieldWrapper>

								<FormFieldWrapper
									label="Highlight Color"
									helpText="Accent color for the project"
									error={validationErrors.highlightColor}
								>
									<div class="color-input-wrapper">
										<input
											type="text"
											bind:value={highlightColor}
											placeholder="#000000"
											pattern="^#[0-9A-Fa-f]{6}$"
										/>
										{#if highlightColor}
											<div class="color-preview" style="background-color: {highlightColor}"></div>
										{/if}
									</div>
								</FormFieldWrapper>
							</div>
						</div>
					</form>
				</div>
			</div>

			<!-- Case Study Panel -->
			<div class="panel case-study-wrapper" class:active={activeTab === 'case-study'}>
				<div class="controls-bar">
					<AdminSegmentedControl
						options={tabOptions}
						value={activeTab}
						onChange={(value) => (activeTab = value)}
					/>
					<div class="save-actions">
						<button onclick={handleSave} disabled={isSaving} class="btn btn-primary save-button">
							{isSaving ? 'Saving...' : status === 'published' ? 'Save' : 'Save Draft'}
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
								{#if status === 'published'}
									<button onclick={handleUnpublish} class="menu-item"> Unpublish </button>
								{:else}
									<button onclick={handlePublish} class="menu-item"> Publish </button>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<div class="editor-content">
					<Editor
						bind:this={editorRef}
						bind:data={caseStudyContent}
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

<style lang="scss">
	.admin-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 $unit-4x $unit-4x;

		@include breakpoint('phone') {
			padding: 0 $unit-2x $unit-2x;
		}
	}

	.controls-bar {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: $unit-2x;
		position: relative;
		padding: 0 $unit-4x $unit-2x;
		border-bottom: 1px solid $grey-80;
		margin-bottom: 0;
		margin-top: -$unit-2x;

		@include breakpoint('phone') {
			padding: 0 $unit-3x $unit-2x;
		}
	}

	.save-actions {
		position: relative;
		display: flex;
		margin-left: auto;
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

		&.btn-secondary {
			background-color: $grey-95;
			color: $grey-20;

			&:hover:not(:disabled) {
				background-color: $grey-90;
				color: $grey-10;
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
		padding: $unit-4x 0;
		max-width: 700px;
		margin: 0 auto;

		@include breakpoint('phone') {
			padding: $unit-3x 0;
		}
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

	.form-section {
		margin-bottom: $unit-6x;

		&:last-child {
			margin-bottom: 0;
		}

		h2 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0 0 $unit-3x;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-2x;
		padding-bottom: $unit-3x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}

		:global(.form-field) {
			margin-bottom: 0;
		}
	}

	input[type='text'],
	input[type='url'],
	input[type='number'],
	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: calc($unit * 1.5);
		border: 1px solid $grey-80;
		border-radius: $unit;
		font-size: 1rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		transition: border-color 0.2s ease;
		background-color: white;
		color: #333;

		&:focus {
			outline: none;
			border-color: $grey-40;
		}

		&::placeholder {
			color: #999;
		}
	}

	textarea {
		resize: vertical;
		min-height: 80px;
	}

	.color-input-wrapper {
		display: flex;
		align-items: center;
		gap: $unit-2x;

		input {
			flex: 1;
		}

		.color-preview {
			width: 40px;
			height: 40px;
			border-radius: $unit;
			border: 1px solid $grey-80;
			flex-shrink: 0;
		}
	}

	.case-study-wrapper {
		background: white;
		border-radius: $unit-2x;
		padding: $unit-4x 0 0;
		min-height: 80vh;
		max-width: 700px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;

		@include breakpoint('phone') {
			padding: $unit-3x 0 0;
			height: 600px;
		}
	}

	.form-content {
		padding: $unit-4x;

		@include breakpoint('phone') {
			padding: $unit-3x;
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
