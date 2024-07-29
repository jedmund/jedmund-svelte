<script lang="ts">
	import Avatar from '$components/Avatar.svelte'
	import MentionList from '$components/MentionList.svelte'
	import Page from '$components/Page.svelte'
	import ProjectList from '$components/ProjectList.svelte'
	import Squiggly from '$components/Squiggly.svelte'
</script>

<Page>
	<svelte:fragment slot="header">
		<h1 aria-label="@jedmund">
			<Avatar />
		</h1>
		<Squiggly text="@jedmund is a software designer" />
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

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	footer {
		font-size: 0.85rem;
		color: $grey-40;
		text-align: center;
	}
</style>
