export interface PostFormTag {
	id: number
	name: string
	displayName: string
	slug: string
}

export interface ApiPost {
	id: number
	slug: string
	postType: string
	title: string | null
	content: Record<string, unknown> | null
	featuredImage: string | null
	tags: Array<{ tag: PostFormTag }> | null
	status: string
	publishedAt: string | null
	createdAt: string
	updatedAt: string
	attachments: unknown
	excerpt?: string | null
	syndicationText?: string | null
	syndicateBluesky?: boolean
	syndicateMastodon?: boolean
	appendLink?: boolean
}
