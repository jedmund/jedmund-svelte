<script lang="ts">
	import { onMount } from 'svelte'
	import Page from '$components/Page.svelte'

	interface SocialReply {
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

	interface SocialRepliesProps {
		contentType: string
		contentId: number
		debug?: boolean
	}

	let { contentType, contentId, debug = false }: SocialRepliesProps = $props()

	const mockReplies: SocialReply[] = [
		{
			id: 'mock-bsky-1',
			platform: 'bluesky',
			author: {
				name: 'Alice Park',
				handle: '@alice.bsky.social',
				avatarUrl: '',
				profileUrl: '#'
			},
			content: 'This is really cool! Love what you\'re doing with the audio player — the waveform visualization is a nice touch.',
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
					content: 'Agreed! The waveform is such a nice detail. Would love to know what library was used.',
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
			content: 'Great write-up. I\'ve been thinking about POSSE for my own site — this is a solid reference implementation.',
			createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
			url: '#'
		}
	]

	let replies = $state<SocialReply[]>([])
	let loading = $state(true)

	onMount(() => {
		if (debug) {
			replies = mockReplies
			loading = false
		} else {
			fetchReplies()
		}
	})

	async function fetchReplies() {
		try {
			const res = await fetch(`/api/syndication/replies?contentType=${contentType}&contentId=${contentId}`)
			if (res.ok) {
				const data = await res.json()
				replies = data.replies
			}
		} catch {
			// Silently fail
		} finally {
			loading = false
		}
	}

	function formatTime(dateStr: string): string {
		const date = new Date(dateStr)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMins = Math.floor(diffMs / 60000)
		const diffHours = Math.floor(diffMs / 3600000)
		const diffDays = Math.floor(diffMs / 86400000)

		if (diffMins < 1) return 'just now'
		if (diffMins < 60) return `${diffMins}m ago`
		if (diffHours < 24) return `${diffHours}h ago`
		if (diffDays < 7) return `${diffDays}d ago`
		return date.toLocaleDateString()
	}

	function stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, '')
	}
</script>

{#snippet renderReply(reply: SocialReply, nested = false)}
	<div class="reply" class:nested>
		<a href={reply.author.profileUrl} target="_blank" rel="noopener noreferrer" class="reply-avatar">
			{#if reply.author.avatarUrl}
				<img src={reply.author.avatarUrl} alt={reply.author.name} />
			{:else}
				<div class="avatar-placeholder"></div>
			{/if}
		</a>
		<div class="reply-body">
			<div class="reply-meta">
				<span class="platform-icon" class:bluesky={reply.platform === 'bluesky'} class:mastodon={reply.platform === 'mastodon'}>
					{#if reply.platform === 'bluesky'}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 530"><path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" fill="currentColor"/></svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 216.4144 232.00976"><path fill="currentColor" d="M211.80734 139.0875c-3.18125 16.36625-28.4925 34.2775-57.5625 37.74875-15.15875 1.80875-30.08375 3.47125-45.99875 2.74125-26.0275-1.1925-46.565-6.2125-46.565-6.2125 0 2.53375.15625 4.94625.46875 7.2025 3.38375 25.68625 25.47 27.225 46.39125 27.9425 21.11625.7225 39.91875-5.20625 39.91875-5.20625l.8675 19.09s-14.77 7.93125-41.08125 9.39c-14.50875.7975-32.52375-.365-53.50625-5.91875C9.23234 213.82 1.40609 165.31125.20859 116.09125c-.365-14.61375-.14-28.39375-.14-39.91875 0-50.33 32.97625-65.0825 32.97625-65.0825C49.67234 3.45375 78.20359.2425 107.86484 0h.72875c29.66125.2425 58.21125 3.45375 74.8375 11.09 0 0 32.975 14.7525 32.975 65.0825 0 0 .41375 37.13375-4.59875 62.915"/><path fill="#fff" d="M177.50984 80.077v60.94125h-24.14375v-59.15c0-12.46875-5.24625-18.7975-15.74-18.7975-11.6025 0-17.4175 7.5075-17.4175 22.3525v32.37625H96.20734V85.42325c0-14.845-5.81625-22.3525-17.41875-22.3525-10.49375 0-15.74 6.32875-15.74 18.7975v59.15H38.90484V80.077c0-12.455 3.17125-22.3525 9.54125-29.675 6.56875-7.3225 15.17125-11.07625 25.85-11.07625 12.355 0 21.71125 4.74875 27.8975 14.2475l6.01375 10.08125 6.015-10.08125c6.185-9.49875 15.54125-14.2475 27.8975-14.2475 10.6775 0 19.28 3.75375 25.85 11.07625 6.36875 7.3225 9.54 17.22 9.54 29.675"/></svg>
					{/if}
				</span>
				<a href={reply.author.profileUrl} target="_blank" rel="noopener noreferrer" class="reply-author">
					{reply.author.name}
				</a>
				<span class="reply-separator">·</span>
				<a href={reply.url} target="_blank" rel="noopener noreferrer" class="reply-time">
					{formatTime(reply.createdAt)}
				</a>
			</div>
			<div class="reply-content">
				{#if reply.platform === 'mastodon'}
					{stripHtml(reply.content)}
				{:else}
					{reply.content}
				{/if}
			</div>
		</div>
	</div>
	{#if !nested && reply.replies?.length}
		<div class="reply-children">
			{#each reply.replies as child}
				{@render renderReply(child, true)}
			{/each}
		</div>
	{/if}
{/snippet}

{#if !loading && replies.length > 0}
	<Page>
		<h3 class="replies-header">Replies</h3>

		<div class="replies-list">
			{#each replies as reply}
				<div class="reply-group">
					{@render renderReply(reply)}
				</div>
			{/each}
		</div>
	</Page>
{/if}

<style lang="scss">
	.replies-header {
		font-size: $font-size;
		font-weight: 600;
		color: $gray-20;
		margin: 0;
	}

	.replies-list {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
	}

	.reply {
		display: flex;
		gap: $unit-2x;
	}

	.reply-avatar {
		flex-shrink: 0;

		img {
			width: 40px;
			height: 40px;
			border-radius: 50%;
			object-fit: cover;
		}
	}

	.avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: $gray-90;
	}

	.reply-body {
		flex: 1;
		min-width: 0;
	}

	.reply-meta {
		display: flex;
		align-items: center;
		gap: $unit-half;
		flex-wrap: wrap;
		margin-bottom: $unit-half;
	}

	.reply-author {
		font-size: $font-size-small;
		font-weight: 600;
		color: $gray-20;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.reply-separator {
		color: $gray-70;
	}

	.reply-time {
		font-size: $font-size-small;
		color: $gray-50;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.platform-icon {
		display: flex;
		align-items: center;

		svg {
			width: 14px;
			height: 14px;
		}

		&.bluesky {
			color: #1185fe;
		}

		&.mastodon {
			color: #6364ff;
		}
	}

	.reply-content {
		font-size: $font-size;
		line-height: 1.5;
		color: $gray-30;
		word-break: break-word;
	}

	.reply-group {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.reply-children {
		margin-left: 52px;
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

</style>
