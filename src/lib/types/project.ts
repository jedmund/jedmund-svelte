export interface Project {
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
	logoUrl: string | null
	gallery: any[] | null
	externalUrl: string | null
	caseStudyContent: any | null
	backgroundColor: string | null
	highlightColor: string | null
	displayOrder: number
	status: string
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
	technologies: string
	externalUrl: string
	featuredImage: string | null
	backgroundColor: string
	highlightColor: string
	logoUrl: string
	gallery: any[] | null
	status: 'draft' | 'published'
	caseStudyContent: any
}

export const defaultProjectFormData: ProjectFormData = {
	title: '',
	subtitle: '',
	description: '',
	year: new Date().getFullYear(),
	client: '',
	role: '',
	technologies: '',
	externalUrl: '',
	featuredImage: null,
	backgroundColor: '',
	highlightColor: '',
	logoUrl: '',
	gallery: null,
	status: 'draft',
	caseStudyContent: {
		type: 'doc',
		content: [{ type: 'paragraph' }]
	}
}
