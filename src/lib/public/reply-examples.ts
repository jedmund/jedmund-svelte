import type { SocialReply } from './social-replies'
export function replyExamples(): SocialReply[] {
	return [
		{
			id: 'mock-bsky-1',
			platform: 'bluesky',
			author: {
				name: 'Alice Park',
				handle: '@alice.bsky.social',
				avatarUrl: '',
				profileUrl: '#'
			},
			content:
				"This is really cool! Love what you're doing with the audio player — the waveform visualization is a nice touch.",
			createdAt: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
			url: '#',
			replies: [
				{
					id: 'mock-bsky-2',
					platform: 'bluesky',
					author: {
						name: 'Carol Chen',
						handle: '@carol.bsky.social',
						avatarUrl: '',
						profileUrl: '#'
					},
					content:
						'Agreed! The waveform is such a nice detail. Would love to know what library was used.',
					createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
					url: '#'
				}
			]
		},
		{
			id: 'mock-mastodon-1',
			platform: 'mastodon',
			author: {
				name: 'Ben Torres',
				handle: '@ben@mastodon.social',
				avatarUrl: '',
				profileUrl: '#'
			},
			content:
				"Great write-up. I've been thinking about POSSE for my own site — this is a solid reference implementation.",
			createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
			url: '#'
		}
	]
}
