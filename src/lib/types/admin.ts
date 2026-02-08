export interface Tag {
	id: number
	name: string
	displayName: string
	slug: string
}

export interface AdminProject {
	id: number
	title: string
	subtitle: string | null
	year: number
	client: string | null
	status: string
	projectType: string
	logoUrl: string | null
	backgroundColor: string | null
	highlightColor: string | null
	publishedAt: string | null
	createdAt: string
	updatedAt: string
}

export interface AdminPost {
	id: number
	slug: string
	postType: string
	title: string | null
	content: unknown
	excerpt?: string | null
	status: string
	tags?: Tag[] | null
	featuredImage: string | null
	publishedAt: string | null
	createdAt: string
	updatedAt: string
	attachments?: unknown
	linkDescription?: string | null
}
