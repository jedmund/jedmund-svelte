<script lang="ts">
	import { page } from '$app/stores'
	import AdminNavBar from '$lib/components/admin/AdminNavBar.svelte'
	import type { LayoutData } from './$types'
	import type { Snippet } from 'svelte'

	const { children, data } = $props<{ children: Snippet; data: LayoutData }>()

	const currentPath = $derived($page.url.pathname)
	const isLoginRoute = $derived(currentPath === '/admin/login')

	// Pages that should use the card metaphor (no .admin-content wrapper)
	const cardLayoutPages = ['/admin']
	const useCardLayout = $derived(cardLayoutPages.includes(currentPath))
</script>

{#if isLoginRoute}
	<!-- On login page, show children without layout -->
	{@render children()}
{:else if !data.user}
	<!-- Server loader should redirect, but provide fallback -->
	<div class="loading">Redirecting to login...</div>
{:else}
	<!-- Authenticated, show admin layout -->
	<div class="admin-container">
		<AdminNavBar />

		{#if useCardLayout}
			<main class="admin-card-layout">
				{@render children()}
			</main>
		{:else}
			<main class="admin-content">
				{@render children()}
			</main>
		{/if}
	</div>
{/if}

<style lang="scss">
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		font-size: 1.125rem;
		color: $gray-40;
	}

	.admin-container {
		height: 100vh;
		overflow: hidden;
		display: flex;
		flex-direction: row;
		background-color: $bg-color;
	}

	.admin-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding-top: $unit;
		padding-right: $unit;
		padding-bottom: $unit;
	}

	.admin-card-layout {
		flex: 1;
		background: $gray-90;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: 0;
		height: 100vh;
	}
</style>
