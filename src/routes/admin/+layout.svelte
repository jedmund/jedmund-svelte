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

		<main class="admin-content">
			{@render children()}
		</main>
	</div>
{/if}

<style lang="scss">
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		font-size: 1.125rem;
		color: $grey-40;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}

	.admin-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: $bg-color;
	}

	.admin-content {
		flex: 1;
		padding-top: $unit-4x;
		padding-bottom: $unit-6x;
	}
</style>
