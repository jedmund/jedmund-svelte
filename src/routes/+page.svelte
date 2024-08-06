<script lang="ts">
	import Album from '$components/Album.svelte'
	import Avatar from '$components/Avatar.svelte'
	import Game from '$components/Game.svelte'
	import MentionList from '$components/MentionList.svelte'
	import Page from '$components/Page.svelte'
	import ProjectList from '$components/ProjectList.svelte'
	import Squiggly from '$components/Squiggly.svelte'

	import type { PageData } from './$types'

	export let data: PageData

	$: ({ albums, games, error } = data)
</script>

<Page>
	<svelte:fragment slot="header">
		<h1 aria-label="@jedmund">
			<Avatar />
		</h1>
		<Squiggly
			text="@jedmund is a software designer that helps you explore what your product can be, unburdened by what it has been"
		/>
	</svelte:fragment>

	<ProjectList />
</Page>

<Page>
	<svelte:fragment slot="header">
		<Squiggly text="A little about me" />
	</svelte:fragment>

	<section class="bio">
		<p>
			Hello! My name is <em>Justin Edmund</em>. I'm a software designer and developer living in San
			Francisco.
		</p>
		<p>
			Right now, I'm spending my free time building a hobby journaling app called <a
				href="https://maitsu.co">Maitsu</a
			>. I've spent time at several companies over the last 11 years, but you might know me as the
			first designer hired at
			<a href="https://www.pinterest.com/" target="_blank">Pinterest</a>.
		</p>
		<p>
			I was born and raised in New York City and spend a lot of time in Tokyo. I graduated from <a
				href="http://design.cmu.edu/"
				target="_blank">Carnegie Mellon University</a
			> in 2011 with a Bachelors of Arts in Communication Design.
		</p>
	</section>

	<MentionList />
</Page>
<Page>
	<svelte:fragment slot="header">
		<Squiggly text="Now playing" />
	</svelte:fragment>

	<section class="weekly-albums">
		{#if albums.length > 0}
			<ul>
				{#each albums.slice(0, 5) as album}
					<Album {album} />
				{/each}
			</ul>
		{:else}
			<p>Loading albums...</p>
		{/if}
	</section>

	<section class="latest-games">
		{#if games && games.length > 0}
			<ul>
				{#each games.slice(0, 3) as game}
					<Game {game} />
				{/each}
			</ul>
		{:else}
			<p>Loading games...</p>
		{/if}
	</section>
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

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.weekly-albums ul {
		display: flex;
		flex-direction: row;
		gap: $unit-4x;
		width: 100%;
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
