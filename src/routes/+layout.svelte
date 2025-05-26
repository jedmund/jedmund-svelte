<script lang="ts">
	import Header from '$components/Header.svelte'
</script>

<svelte:head>
	<title>@jedmund is a software designer</title>
	<meta name="description" content="Justin Edmund is a software designer based in San Francisco." />
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, 
user-scalable=no"
	/>
</svelte:head>

<Header />

<main>
	<slot />
</main>

<style lang="scss">
	@import '../assets/styles/reset.css';
	@import '../assets/styles/globals.scss';

	:global(html) {
		background: var(--bg-color);
		color: var(--text-color);
		font-family: 'cstd', 'Helvetica Neue', Helvetica, Arial, sans-serif;
		font-size: 16px;
		width: 100%;
	}
	
	:global(body) {
		margin: 0;
		padding: 0;
	}

	@include breakpoint('phone') {
		:global(html) {
			font-size: 18px;
		}
	}
</style>
