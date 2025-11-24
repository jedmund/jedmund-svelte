import { projectSchema } from '$lib/schemas/project'
import type { Project, ProjectFormData } from '$lib/types/project'
import { defaultProjectFormData } from '$lib/types/project'

export function createProjectFormStore(initialProject?: Project | null) {
	// Reactive state using $state rune
	let fields = $state<ProjectFormData>({ ...defaultProjectFormData })
	let validationErrors = $state<Record<string, string>>({})
	let original = $state<ProjectFormData | null>(null)

	// Derived state using $derived rune
	const isDirty = $derived(
		original ? JSON.stringify(fields) !== JSON.stringify(original) : false
	)

	// Initialize from project if provided
	if (initialProject) {
		populateFromProject(initialProject)
	}

	function populateFromProject(project: Project) {
		fields = {
			title: project.title || '',
			subtitle: project.subtitle || '',
			description: project.description || '',
			year: project.year || new Date().getFullYear(),
			client: project.client || '',
			role: project.role || '',
			projectType: project.projectType || 'work',
			externalUrl: project.externalUrl || '',
			featuredImage: project.featuredImage || null,
			logoUrl: project.logoUrl || '',
			backgroundColor: project.backgroundColor || '',
			highlightColor: project.highlightColor || '',
			status: project.status || 'draft',
			password: project.password || '',
			caseStudyContent: project.caseStudyContent || {
				type: 'doc',
				content: [{ type: 'paragraph' }]
			},
			showFeaturedImageInHeader: project.showFeaturedImageInHeader ?? true,
			showBackgroundColorInHeader: project.showBackgroundColorInHeader ?? true,
			showLogoInHeader: project.showLogoInHeader ?? true
		}
		original = { ...fields }
	}

	return {
		// State is returned directly - it's already reactive in Svelte 5
		// Components can read: formStore.fields.title
		// Mutation should go through methods below for validation
		fields,
		validationErrors,
		isDirty,

		// Methods for controlled mutation
		setField(key: keyof ProjectFormData, value: unknown) {
			fields[key] = value
		},

		setFields(data: Partial<ProjectFormData>) {
			fields = { ...fields, ...data }
		},

		validate(): boolean {
			const result = projectSchema.safeParse(fields)
			if (!result.success) {
				const flattened = result.error.flatten()
				validationErrors = Object.fromEntries(
					Object.entries(flattened.fieldErrors).map(([key, errors]) => [
						key,
						Array.isArray(errors) ? errors[0] : ''
					])
				)
				return false
			}
			validationErrors = {}
			return true
		},

		reset() {
			fields = { ...defaultProjectFormData }
			validationErrors = {}
			original = null
		},

		populateFromProject,

		buildPayload() {
			return {
				title: fields.title,
				subtitle: fields.subtitle,
				description: fields.description,
				year: fields.year,
				client: fields.client,
				role: fields.role,
				projectType: fields.projectType,
				externalUrl: fields.externalUrl,
				featuredImage: fields.featuredImage && fields.featuredImage !== '' ? fields.featuredImage : null,
				logoUrl: fields.logoUrl && fields.logoUrl !== '' ? fields.logoUrl : null,
				backgroundColor: fields.backgroundColor,
				highlightColor: fields.highlightColor,
				status: fields.status,
				password: fields.status === 'password-protected' ? fields.password : null,
				caseStudyContent:
					fields.caseStudyContent &&
					fields.caseStudyContent.content &&
					fields.caseStudyContent.content.length > 0
						? fields.caseStudyContent
						: null,
				showFeaturedImageInHeader: fields.showFeaturedImageInHeader,
				showBackgroundColorInHeader: fields.showBackgroundColorInHeader,
				showLogoInHeader: fields.showLogoInHeader
			}
		}
	}
}

export type ProjectFormStore = ReturnType<typeof createProjectFormStore>
