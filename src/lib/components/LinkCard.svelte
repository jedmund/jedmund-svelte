<script lang="ts">
	import { onMount } from 'svelte'
	import type { Post } from '$lib/posts'

	let {
		link
	}: {
		link: Post['link']
	} = $props()

	let metadata = $state<{
		url: string
		title?: string
		description?: string
		image?: string
		favicon?: string
		siteName?: string
	} | null>(null)

	let loading = $state(true)
	let error = $state(false)

	const getDomain = (url: string) => {
		try {
			const urlObj = new URL(url)
			return urlObj.hostname.replace('www.', '')
		} catch {
			return ''
		}
	}

	const handleClick = () => {
		const url = typeof link === 'string' ? link : link?.url
		if (url) {
			window.open(url, '_blank', 'noopener,noreferrer')
		}
	}

	onMount(async () => {
		// If link is just a string URL, fetch metadata
		if (typeof link === 'string') {
			try {
				const response = await fetch(`/api/og-metadata?url=${encodeURIComponent(link)}`)
				if (response.ok) {
					metadata = await response.json()
				} else {
					error = true
				}
			} catch (err) {
				console.error('Failed to fetch metadata:', err)
				error = true
			}
		} else if (link) {
			// Use provided metadata
			metadata = link
		}
		loading = false
	})
</script>

{#if loading}
	<div class="link-card loading">
		<div class="link-content">
			<div class="skeleton skeleton-meta"></div>
			<div class="skeleton skeleton-title"></div>
			<div class="skeleton skeleton-description"></div>
		</div>
	</div>
{:else if error}
	<button class="link-card error" onclick={handleClick}>
		<div class="link-content">
			<p class="error-message">Unable to load preview</p>
			<p class="link-url">{typeof link === 'string' ? link : link?.url}</p>
		</div>
	</button>
{:else if metadata}
	<button class="link-card" onclick={handleClick}>
		{#if metadata.image}
			<div class="link-image">
				<img src={metadata.image} alt={metadata.title || 'Link preview'} />
			</div>
		{/if}
		<div class="link-content">
			<div class="link-meta">
				{#if metadata.favicon}
					<img src={metadata.favicon} alt="" class="favicon" />
				{/if}
				<span class="domain">{metadata.siteName || getDomain(metadata.url)}</span>
			</div>
			{#if metadata.title}
				<h3 class="link-title">{metadata.title}</h3>
			{/if}
			{#if metadata.description}
				<p class="link-description">{metadata.description}</p>
			{/if}
		</div>
	</button>
{/if}

<style lang="scss">
	.link-card {
		display: flex;
		flex-direction: column;
		background: $grey-90;
		border-radius: $image-corner-radius;
		overflow: hidden;
		border: 1px solid $grey-80;
		padding: 0;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: border-color 0.2s ease;

		&:hover {
			border-color: $grey-50;
		}

		&:focus {
			outline: 2px solid $red-60;
			outline-offset: 2px;
		}

		// Loading state
		&.loading {
			cursor: default;

			&:hover {
				border-color: $grey-80;
			}
		}

		// Error state
		&.error {
			.link-content {
				text-align: center;
			}
		}
	}

	.link-image {
		width: 100%;
		aspect-ratio: 2 / 1;
		overflow: hidden;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.link-content {
		padding: $unit-3x;
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.link-meta {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: 0.875rem;
		color: $grey-40;
	}

	.favicon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.domain {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.link-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: $grey-00;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}

	.link-description {
		margin: 0;
		font-size: 0.875rem;
		color: $grey-40;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		overflow: hidden;
	}

	.skeleton {
		background: $grey-80;
		border-radius: 4px;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.skeleton-meta {
		height: 1rem;
		width: 40%;
	}

	.skeleton-title {
		height: 1.3rem;
		width: 85%;
	}

	.skeleton-description {
		height: 3rem;
		width: 100%;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.error-message {
		margin: 0 0 $unit;
		color: $grey-40;
		font-size: 0.875rem;
	}

	.link-url {
		margin: 0;
		color: $red-60;
		font-size: 0.875rem;
		word-break: break-all;
	}
</style>
