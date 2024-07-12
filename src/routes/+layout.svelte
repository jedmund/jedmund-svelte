<script lang="ts">
	import '$lib/styles/reset.css'
	import '$lib/styles/fonts.css'
	import '$lib/styles/globals.scss'
</script>

<svelte:head>
	<title>@jedmund</title>
	<meta
		name="description"
		content="Justin Edmund is a software designer based in San Francisco, California."
	/>
</svelte:head>

<main>
	<section class="page">
		<slot />
	</section>
</main>

<style lang="scss">
	:global(html) {
		background: var(--bg-color);
		color: var(--text-color);
		font-family: 'cstd', 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}

	.page {
		background: var(--page-color);
		border-radius: 16px;
		box-sizing: border-box;
		margin: 48px auto 48px;
		padding: 40px;
		width: 784px;
	}
</style>
