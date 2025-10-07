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
