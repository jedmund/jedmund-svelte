<script lang="ts">
</script>

<svelte:head>
	<title>@jedmund</title>
	<meta
		name="description"
		content="Justin Edmund is a software designer based in San Francisco, California."
	/>
	<!-- <link href="/assets/styles/reset.css" rel="stylesheet" /> -->
</svelte:head>

<main>
	<slot />
</main>

<style lang="scss">
	:global(html) {
		background: var(--bg-color);
		color: var(--text-color);
		font-family: 'cstd', 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}
</style>
