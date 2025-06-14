export type ProjectStatus = 'draft' | 'published' | 'list-only' | 'password-protected'
export type ProjectType = 'work' | 'labs'

export interface Project {
	id: number
	slug: string
	title: string
	subtitle: string | null
	description: string | null
	year: number
	client: string | null
	role: string | null
	featuredImage: string | null
	logoUrl: string | null
	externalUrl: string | null
	caseStudyContent: any | null
	backgroundColor: string | null
	highlightColor: string | null
	projectType: ProjectType
	displayOrder: number
	status: ProjectStatus
	password: string | null
	createdAt?: string
	updatedAt?: string
	publishedAt?: string | null
}

export interface ProjectFormData {
	title: string
	subtitle: string
	description: string
	year: number
	client: string
	role: string
	projectType: ProjectType
	externalUrl: string
	featuredImage: string | null
	backgroundColor: string
	highlightColor: string
	logoUrl: string
	status: ProjectStatus
	password: string
	caseStudyContent: any
}

export const defaultProjectFormData: ProjectFormData = {
	title: '',
	subtitle: '',
	description: '',
	year: new Date().getFullYear(),
	client: '',
	role: '',
	projectType: 'work',
	externalUrl: '',
	featuredImage: null,
	backgroundColor: '',
	highlightColor: '',
	logoUrl: '',
	status: 'draft',
	password: '',
	caseStudyContent: {
		type: 'doc',
		content: [{ type: 'paragraph' }]
	}
}
