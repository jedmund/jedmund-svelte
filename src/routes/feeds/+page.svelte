<script lang="ts">
	import Page from '$components/Page.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'

	const pageUrl = $derived($page.url.href)

	const metaTags = $derived(
		generateMetaTags({
			title: 'Feeds',
			description: 'Subscribe to jedmund.com via RSS to follow posts, photos, and more.',
			url: pageUrl,
			titleFormat: { type: 'about' }
		})
	)

	const feeds = [
		{
			name: 'jedmund.com',
			url: '/rss',
			description: 'Everything — posts, photo albums, and more.'
		},
		{
			name: 'Photos',
			url: '/rss/photos',
			description: 'Photo albums and standalone photos.'
		}
	]
</script>

<svelte:head>
	<title>{metaTags.title}</title>
	<meta name="description" content={metaTags.description} />

	{#each Object.entries(metaTags.openGraph) as [property, content]}
		<meta property="og:{property}" {content} />
	{/each}

	{#each Object.entries(metaTags.twitter) as [property, content]}
		<meta name="twitter:{property}" {content} />
	{/each}

	<link rel="canonical" href={metaTags.other.canonical} />
</svelte:head>

<section class="feeds-container">
	<Page>
		{#snippet header()}
			<h2>Feeds</h2>
		{/snippet}

		<section class="explainer">
			<p>
				You can follow this site using RSS, a standard format that lets you subscribe to websites
				and read new posts in one place. Copy a feed URL below into your reader of choice, or
				click Subscribe to open it directly.
			</p>
			<p>
				If you're new to RSS,
				<a href="https://netnewswire.com/" target="_blank" rel="noopener noreferrer"
					>NetNewsWire</a
				>
				is a great free reader for Mac and iOS, and
				<a href="https://feedly.com/" target="_blank" rel="noopener noreferrer">Feedly</a>
				works well on the web.
			</p>
		</section>

		<ul class="feed-list">
			{#each feeds as feed}
				<li class="feed-item">
					<div class="feed-info">
						<h3>{feed.name}</h3>
						<p>{feed.description}</p>
					</div>
					<a href={feed.url} class="feed-link">Subscribe</a>
				</li>
			{/each}
		</ul>
	</Page>
</section>

<style lang="scss">
	.feeds-container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		max-width: 700px;
		margin: 0 auto;

		@include breakpoint('phone') {
			padding: 0 $unit-2x;
		}

		:global(.page) {
			margin: 0;
		}
	}

	h2 {
		color: $accent-color;
		font-size: 1.2rem;
		font-weight: 500;
		margin: 0;
	}

	.explainer {
		font-size: 1rem;
		line-height: 1.5;
		color: $gray-00;

		p {
			margin: 0 0 $unit 0;

			&:last-child {
				margin-bottom: 0;
			}
		}

		a {
			color: $red-60;
			text-decoration: none;

			&:hover {
				text-decoration: underline;
				text-decoration-style: wavy;
			}
		}
	}

	.feed-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.feed-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-2x;
		background: $gray-95;
		border-radius: $corner-radius-lg;
		gap: $unit-2x;

		h3 {
			font-size: 1rem;
			font-weight: 500;
			margin: 0;
			color: $gray-00;
		}

		p {
			font-size: 0.875rem;
			color: $gray-40;
			margin: 4px 0 0 0;
		}
	}

	.feed-link {
		flex-shrink: 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: #ffffff;
		text-decoration: none;
		padding: $unit $unit-2x;
		background: $red-60;
		border: none;
		border-radius: $corner-radius-lg;
		transition: background 0.2s ease;

		&:hover {
			background: $red-50;
		}
	}
</style>
