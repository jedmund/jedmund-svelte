<script>
	import Mention from './Mention.svelte'

	const mentions = [
		{
			href: 'https://medium.com/figma-design/pinterests-first-design-hire-built-a-habit-formation-app-a6aee9103610',
			title: "Pinterest's first design hire built an app for passion projects",
			sourceType: 'Blog',
			date: 'Apr 2018'
		},
		{
			href: 'http://revisionpath.com/justin-edmund/',
			title: 'Revision Path #113',
			sourceType: 'Podcast',
			date: 'Dec 2015'
		},
		{
			href: 'https://designdetails.fm/episodes/a4cc2bff',
			title: 'Design Details #76',
			sourceType: 'Podcast',
			date: 'Nov 2015'
		},
		{
			href: 'http://www.usatoday.com/story/tech/2014/10/30/justin-edmund-pinterest-diversity-silicon-valley-ferguson-african-americans-hispanics-technology/17832781/',
			title: "Pinterest's seventh employee on being black in Silicon Valley",
			source: 'USA Today',
			sourceType: 'Article',
			date: 'Oct 2014'
		},
		{
			href: 'http://www.cmu.edu/homepage/creativity/2012/spring/hopes-pinned-on-success.shtml',
			title: 'Hopes Pinned on Success',
			source: 'Carnegie Mellon Today',
			sourceType: 'Article',
			date: 'May 2012'
		},
		{
			href: 'http://www.reuters.com/article/us-designers-startup-idUSBRE83C0QG20120416',
			title: 'In Silicon Valley, designers emerge as rock stars',
			source: 'Reuters',
			sourceType: 'Article',
			date: 'Apr 2012'
		}
	]
</script>

<section class="links">
	<ul>
		{#each mentions as mention (mention.href)}
			<Mention {...mention} />
		{/each}
	</ul>
</section>

<style lang="scss">
	.links {
		ul {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: $unit-2x;
			list-style: none;
			padding: 0;
			margin: 0;
		}

		@include breakpoint('phone') {
			ul {
				grid-template-columns: 1fr;
			}
		}
	}
</style>
