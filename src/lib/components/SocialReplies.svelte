<script lang="ts">
	import { onMount } from 'svelte'

	interface SocialReply {
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
	}

	interface SyndicationRecord {
		platform: string
		externalUrl: string | null
	}

	interface SocialRepliesProps {
		contentType: string
		contentId: number
	}

	let { contentType, contentId }: SocialRepliesProps = $props()

	let replies = $state<SocialReply[]>([])
	let syndications = $state<SyndicationRecord[]>([])
	let loading = $state(true)

	const blueskyUrl = $derived(syndications.find(s => s.platform === 'bluesky')?.externalUrl)
	const mastodonUrl = $derived(syndications.find(s => s.platform === 'mastodon')?.externalUrl)

	onMount(() => {
		fetchReplies()
	})

	async function fetchReplies() {
		try {
			const res = await fetch(`/api/syndication/replies?contentType=${contentType}&contentId=${contentId}`)
			if (res.ok) {
				const data = await res.json()
				replies = data.replies
				syndications = data.syndications || []
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

{#if !loading && (replies.length > 0 || blueskyUrl || mastodonUrl)}
	<div class="social-replies">
		{#if replies.length > 0}
			<h2 class="replies-header">Replies ({replies.length})</h2>

			<div class="replies-list">
				{#each replies as reply}
					<div class="reply">
						<a href={reply.author.profileUrl} target="_blank" rel="noopener noreferrer" class="reply-avatar">
							{#if reply.author.avatarUrl}
								<img src={reply.author.avatarUrl} alt={reply.author.name} />
							{:else}
								<div class="avatar-placeholder"></div>
							{/if}
						</a>
						<div class="reply-body">
							<div class="reply-meta">
								<a href={reply.author.profileUrl} target="_blank" rel="noopener noreferrer" class="reply-author">
									{reply.author.name}
								</a>
								<span class="reply-handle">{reply.author.handle}</span>
								<span class="reply-separator">·</span>
								<a href={reply.url} target="_blank" rel="noopener noreferrer" class="reply-time">
									{formatTime(reply.createdAt)}
								</a>
								<span class="platform-badge" class:bluesky={reply.platform === 'bluesky'} class:mastodon={reply.platform === 'mastodon'}>
									{reply.platform === 'bluesky' ? 'bsky' : 'masto'}
								</span>
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
				{/each}
			</div>
		{/if}

		{#if blueskyUrl || mastodonUrl}
			<div class="reply-cta">
				{#if blueskyUrl}
					<a href={blueskyUrl} target="_blank" rel="noopener noreferrer" class="cta-link bluesky">
						Reply on Bluesky
					</a>
				{/if}
				{#if mastodonUrl}
					<a href={mastodonUrl} target="_blank" rel="noopener noreferrer" class="cta-link mastodon">
						Reply on Mastodon
					</a>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style lang="scss">
	.social-replies {
		margin-top: $unit-8x;
		padding-top: $unit-6x;
		border-top: 1px solid $gray-90;
		max-width: 680px;
	}

	.replies-header {
		font-size: $font-size-large;
		font-weight: 600;
		color: $gray-20;
		margin: 0 0 $unit-4x;
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

	.reply-handle {
		font-size: $font-size-small;
		color: $gray-50;
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

	$mastodon-purple: rgb(99, 100, 255);

	.platform-badge {
		font-size: $font-size-extra-small;
		padding: $unit-fourth $unit;
		border-radius: $corner-radius-xs;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;

		&.bluesky {
			background: rgba($blue-50, 0.1);
			color: $blue-40;
		}

		&.mastodon {
			background: rgba($mastodon-purple, 0.1);
			color: $mastodon-purple;
		}
	}

	.reply-content {
		font-size: $font-size;
		line-height: 1.5;
		color: $gray-30;
		word-break: break-word;
	}

	.reply-cta {
		display: flex;
		gap: $unit-2x;
		margin-top: $unit-4x;
		padding-top: $unit-4x;
		border-top: 1px solid $gray-95;
	}

	.cta-link {
		font-size: $font-size-small;
		font-weight: 500;
		padding: $unit $unit-3x;
		border-radius: $corner-radius;
		text-decoration: none;
		transition: background 0.15s ease;

		&.bluesky {
			color: $blue-40;
			background: rgba($blue-50, 0.08);

			&:hover {
				background: rgba($blue-50, 0.15);
			}
		}

		&.mastodon {
			color: $mastodon-purple;
			background: rgba($mastodon-purple, 0.08);

			&:hover {
				background: rgba($mastodon-purple, 0.15);
			}
		}
	}
</style>
