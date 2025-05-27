export interface LabProject {
	id: string
	title: string
	description: string
	status: 'active' | 'maintenance' | 'archived'
	technologies: string[]
	url?: string
	github?: string
	image?: string
	featured?: boolean
	year: number
}

export type ProjectStatus = 'active' | 'maintenance' | 'archived'