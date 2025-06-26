<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminNavBar from '$lib/components/admin/AdminNavBar.svelte'

	let { children } = $props()

	// Check if user is authenticated
	let isAuthenticated = $state(false)
	let isLoading = $state(true)

	onMount(() => {
		// Check localStorage for auth token
		const auth = localStorage.getItem('admin_auth')
		if (auth) {
			isAuthenticated = true
		} else if ($page.url.pathname !== '/admin/login') {
			// Redirect to login if not authenticated
			goto('/admin/login')
		}
		isLoading = false
	})

	const currentPath = $derived($page.url.pathname)

	// Pages that should use the card metaphor (no .admin-content wrapper)
	const cardLayoutPages = ['/admin']
	const useCardLayout = $derived(cardLayoutPages.includes(currentPath))
</script>

{#if isLoading}
	<div class="loading">Loading...</div>
{:else if !isAuthenticated && currentPath !== '/admin/login'}
	<!-- Not authenticated and not on login page, redirect will happen in onMount -->
	<div class="loading">Redirecting to login...</div>
{:else if currentPath === '/admin/login'}
	<!-- On login page, show children without layout -->
	{@render children()}
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
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: $bg-color;
	}

	.admin-content {
		flex: 1;
	}

	.admin-card-layout {
		flex: 1;
		background: $gray-90;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: $unit-6x $unit-4x;
		min-height: calc(100vh - 60px); // Account for navbar
	}
</style>
