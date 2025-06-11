<script lang="ts">
	import { page } from '$app/stores'
	import Header from '$components/Header.svelte'
	import Footer from '$components/Footer.svelte'

	$: isAdminRoute = $page.url.pathname.startsWith('/admin')
</script>

<svelte:head>
	<title>@jedmund is a software designer</title>
	<meta name="description" content="Justin Edmund is a software designer based in San Francisco." />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
</svelte:head>

<div class="layout-wrapper" class:admin-route={isAdminRoute}>
	{#if !isAdminRoute}
		<Header />
	{/if}

	<main class:admin-route={isAdminRoute}>
		<slot />
	</main>

	{#if !isAdminRoute}
		<Footer />
	{/if}
</div>

<style lang="scss">
	@import '../assets/styles/reset.css';
	@import '../assets/styles/globals.scss';

	:global(html) {
		background: var(--bg-color);
		color: var(--text-color);
		font-size: 16px;
		width: 100%;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.layout-wrapper {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		width: 100%;

		&.admin-route {
			min-height: auto;
		}
	}

	main {
		flex: 1 0 auto;

		&.admin-route {
			min-height: auto;
		}
	}

	@include breakpoint('phone') {
		:global(html) {
			font-size: 18px;
		}
	}
</style>
