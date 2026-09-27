export interface SocialReply {
	id: string
	platform: 'bluesky' | 'mastodon'
	author: {
		name: string
		handle: string
		avatarUrl: string
		profileUrl: string
	}
	content: string
	createdAt: string
	url: string
	replies?: SocialReply[]
}
