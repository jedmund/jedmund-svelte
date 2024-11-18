<script lang="ts">
	import Album from '$components/Album.svelte'
	import Avatar from '$components/Avatar.svelte'
	import Game from '$components/Game.svelte'
	import MentionList from '$components/MentionList.svelte'
	import Page from '$components/Page.svelte'
	import ProjectList from '$components/ProjectList.svelte'
	import RecentAlbums from '$components/RecentAlbums.svelte'

	import type { PageData } from './$types'

	export let data: PageData

	$: ({ albums, games, error } = data)
</script>

<Page>
	<svelte:fragment slot="header">
		<h1 aria-label="@jedmund">
			<Avatar />
		</h1>
		<h2 class="subheader">@jedmund is a software designer</h2>
	</svelte:fragment>

	<ProjectList />
</Page>

<Page>
	<svelte:fragment slot="header">
		<h2>A little about me</h2>
	</svelte:fragment>

	<section class="bio">
		<p>
			Hello! My name is <em>Justin Edmund</em>. I'm a software designer and developer living in San
			Francisco.
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
	<svelte:fragment slot="header">
		<h2>Notable mentions</h2>
	</svelte:fragment>

	<MentionList />
</Page>
<Page noHorizontalPadding={true}>
	<svelte:fragment slot="header">
		<h2>Now playing</h2>
	</svelte:fragment>

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

<footer>
	<p>&copy; 2024 Justin Edmund</p>
</footer>

<style lang="scss">
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

	header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: $unit-2x;
	}

	h1,
	h2 {
		margin: 0;
	}

	h2 {
		color: $accent-color;
		font-size: 1.2rem;
		font-weight: 500;

		&.subheader {
			margin-bottom: $unit-2x;
		}
	}

	.bio {
		font-size: 1rem;
		line-height: 1.3;

		p:first-child {
			margin-top: 0;
		}

		p:last-child {
			margin-bottom: 0;
		}
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.latest-games ul {
		display: flex;
		flex-direction: row;
		gap: $unit-4x;
		width: 100%;
	}

	footer {
		font-size: 0.85rem;
		color: $grey-40;
		text-align: center;
	}
</style>
