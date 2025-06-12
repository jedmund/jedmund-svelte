<script lang="ts">
	import Album from '$components/Album.svelte'
	import Game from '$components/Game.svelte'
	import MentionList from '$components/MentionList.svelte'
	import Page from '$components/Page.svelte'
	import RecentAlbums from '$components/RecentAlbums.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'

	import type { PageData } from './$types'

	let { data } = $props<{ data: PageData }>()

	let albums = $derived(data.albums)
	let games = $derived(data.games)
	let error = $derived(data.error)

	const pageUrl = $derived($page.url.href)

	// Generate metadata for about page
	const metaTags = $derived(
		generateMetaTags({
			title: 'About',
			description:
				'Software designer and developer living in San Francisco. Building thoughtful digital experiences and currently working on Maitsu, a hobby journaling app.',
			url: pageUrl,
			type: 'profile',
			titleFormat: { type: 'about' }
		})
	)
</script>

<svelte:head>
	<title>{metaTags.title}</title>
	<meta name="description" content={metaTags.description} />

	<!-- OpenGraph -->
	{#each Object.entries(metaTags.openGraph) as [property, content]}
		<meta property="og:{property}" {content} />
	{/each}

	<!-- Twitter Card -->
	{#each Object.entries(metaTags.twitter) as [property, content]}
		<meta name="twitter:{property}" {content} />
	{/each}

	<!-- Canonical URL -->
	<link rel="canonical" href={metaTags.other.canonical} />
</svelte:head>

<section class="about-container">
	<Page>
		{#snippet header()}
			<h2>A little about me</h2>
		{/snippet}

		<section class="bio">
			<p>
				Hello! My name is <em>Justin Edmund</em>. I'm a software designer and developer living in
				San Francisco.
			</p>
			<p>
				Right now, I'm spending my free time building a hobby journaling app called <a
					href="https://maitsu.co"
					target="_blank">Maitsu</a
				>. I've spent time at several companies over the last 11 years, but you might know me from
				<a href="https://www.pinterest.com/" target="_blank">Pinterest</a>, where I was the first
				design hire.
			</p>
			<p>
				I was born and raised in New York City and spend a lot of time in Tokyo. I graduated from <a
					href="http://design.cmu.edu/"
					target="_blank">Carnegie Mellon University</a
				> in 2011 with a Bachelors of Arts in Communication Design.
			</p>
		</section>
	</Page>
	<Page>
		{#snippet header()}
			<h2>Notable mentions</h2>
		{/snippet}

		<MentionList />
	</Page>
	<Page noHorizontalPadding={true}>
		{#snippet header()}
			<h2>Now playing</h2>
		{/snippet}

		<RecentAlbums {albums} />

		<!-- <section class="latest-games">
		{#if games && games.length > 0}
			<ul>
				{#each games.slice(0, 3) as game}
					<Game {game} />
				{/each}
			</ul>
		{:else}
			<p>Loading games...</p>
		{/if}
	</section> -->
	</Page>
</section>

<style lang="scss">
	.about-container {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
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

	a,
	em {
		color: $red-60;
		font-weight: 500;
		font-style: normal;
		text-decoration: none;
	}

	a:hover {
		cursor: pointer;
		text-decoration: underline;
		text-decoration-style: wavy;
	}

	h2 {
		color: $accent-color;
		font-size: 1.2rem;
		font-weight: 500;
		margin: 0;
	}

	.bio {
		font-size: 1rem;
		line-height: 1.5;
		color: #333;
		background: $grey-100;
		border-radius: $card-corner-radius;

		p:first-child {
			margin-top: 0;
		}

		p:last-child {
			margin-bottom: 0;
		}
	}
</style>
