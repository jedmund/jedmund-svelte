<script lang="ts">
	import '../app.css'
	import { page } from '$app/stores'
	import Header from '$components/Header.svelte'
	import Footer from '$components/Footer.svelte'
	import { generatePersonJsonLd } from '$lib/utils/metadata'

	let { children } = $props()

	const isAdminRoute = $derived($page.url.pathname.startsWith('/admin'))

	// Generate person structured data for the site
	const personJsonLd = $derived(
		generatePersonJsonLd({
			name: 'Justin Edmund',
			jobTitle: 'Software Designer',
			description: 'Software designer based in San Francisco',
			url: 'https://jedmund.com',
			sameAs: [
				'https://twitter.com/jedmund',
				'https://github.com/jedmund',
				'https://www.linkedin.com/in/jedmund'
			]
		})
	)
</script>

<svelte:head>
	<!-- Site-wide JSON-LD -->
	{@html `<script type="application/ld+json">${JSON.stringify(personJsonLd)}</script>`}
</svelte:head>

<div class="layout-wrapper" class:admin-route={isAdminRoute}>
	{#if !isAdminRoute}
		<Header />
	{/if}

	<main class:admin-route={isAdminRoute}>
		{@render children()}
	</main>

	{#if !isAdminRoute}
		<Footer />
	{/if}
</div>

<style lang="scss">
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
