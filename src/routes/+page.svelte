<script lang="ts">
	import Avatar from '$components/Avatar.svelte'
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
