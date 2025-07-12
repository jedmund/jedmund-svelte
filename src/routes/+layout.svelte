<script lang="ts">
	import '../app.css'
	import { page } from '$app/stores'
	import Header from '$components/Header.svelte'
	import Footer from '$components/Footer.svelte'
	import DebugPanel from '$components/DebugPanel.svelte'
	import { generatePersonJsonLd } from '$lib/utils/metadata'
	import { Toaster } from 'svelte-sonner'

	let { children } = $props()

	const isAdminRoute = $derived($page.url.pathname.startsWith('/admin'))
	const isAboutPage = $derived($page.url.pathname === '/about')

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

<!-- Toast notifications -->
<Toaster
	position={isAdminRoute ? 'top-right' : 'bottom-right'}
	toastOptions={{
		className: 'sonner-toast',
		duration: 4000
	}}
/>

<!-- Debug Panel (dev only, about page only) -->
{#if isAboutPage}
	<DebugPanel />
{/if}

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

	/* Toast styles */
	:global(.sonner-toaster) {
		font-family: $font-stack;
	}

	:global(.sonner-toast) {
		background: var(--page-color) !important;
		color: var(--text-color) !important;
		border: 1px solid $gray-85 !important;
		border-radius: $corner-radius-lg !important;
		box-shadow: $card-shadow !important;
		font-size: $font-size-small !important;
		padding: $unit-2x !important;
		gap: $unit !important;
		max-width: 420px !important;

		&[data-type='success'] {
			background: $blue-10 !important;
			border-color: $blue-40 !important;
			color: $blue-40 !important;

			[data-icon] {
				color: $blue-50 !important;
			}
		}

		&[data-type='error'] {
			background: #fef2f2 !important;
			border-color: $red-50 !important;
			color: $red-40 !important;

			[data-icon] {
				color: $red-50 !important;
			}
		}

		&[data-type='warning'] {
			background: $yellow-90 !important;
			border-color: $yellow-40 !important;
			color: $yellow-20 !important;

			[data-icon] {
				color: $yellow-40 !important;
			}
		}

		&[data-type='info'] {
			background: var(--page-color) !important;
			border-color: $gray-70 !important;
			color: var(--text-color) !important;

			[data-icon] {
				color: $gray-40 !important;
			}
		}

		&[data-type='loading'] {
			background: var(--page-color) !important;
			border-color: $primary-color !important;
			color: var(--text-color) !important;

			[data-icon] {
				color: $primary-color !important;
			}
		}
	}

	:global(.sonner-toast-description) {
		color: var(--text-color-subdued) !important;
		font-size: $font-size-extra-small !important;
		margin-top: $unit-half !important;
	}

	:global(.sonner-toast-action) {
		background: $primary-color !important;
		color: white !important;
		border: none !important;
		border-radius: $corner-radius-sm !important;
		padding: $unit-half $unit-2x !important;
		font-size: $font-size-extra-small !important;
		font-weight: $font-weight-med !important;
		transition: background-color $transition-normal ease !important;

		&:hover {
			background: $blue-40 !important;
		}
	}

	:global(.sonner-toast-cancel) {
		background: transparent !important;
		color: $gray-40 !important;
		border: 1px solid $gray-70 !important;
		border-radius: $corner-radius-sm !important;
		padding: $unit-half $unit-2x !important;
		font-size: $font-size-extra-small !important;
		font-weight: $font-weight-med !important;
		transition: all $transition-normal ease !important;

		&:hover {
			background: $gray-95 !important;
			color: $gray-20 !important;
			border-color: $gray-60 !important;
		}
	}

	/* Admin-specific toast positioning */
	.admin-route ~ :global(.sonner-toaster) {
		top: $unit-8x !important; // Account for admin navbar
	}
</style>
