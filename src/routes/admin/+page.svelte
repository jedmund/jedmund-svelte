<script lang="ts">
	import { onMount } from 'svelte'
	import Page from '$lib/components/Page.svelte'

	interface Stats {
		projects: number
		posts: number
		albums: number
		photos: number
		media: number
	}

	let stats = $state<Stats | null>(null)
	let isLoading = $state(true)
	let error = $state('')

	onMount(async () => {
		await loadStats()
	})

	async function loadStats() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) return

			// Fetch counts from each endpoint
			const [projectsRes, postsRes, albumsRes, mediaRes] = await Promise.all([
				fetch('/api/projects?limit=1', {
					headers: { Authorization: `Basic ${auth}` }
				}),
				fetch('/api/posts?limit=1', {
					headers: { Authorization: `Basic ${auth}` }
				}),
				fetch('/api/albums?limit=1', {
					headers: { Authorization: `Basic ${auth}` }
				}),
				fetch('/api/media?limit=1', {
					headers: { Authorization: `Basic ${auth}` }
				})
			])

			const projectsData = projectsRes.ok ? await projectsRes.json() : { pagination: { total: 0 } }
			const postsData = postsRes.ok ? await postsRes.json() : { pagination: { total: 0 } }
			const albumsData = albumsRes.ok ? await albumsRes.json() : { pagination: { total: 0 } }
			const mediaData = mediaRes.ok ? await mediaRes.json() : { pagination: { total: 0 } }

			// TODO: Get photo count once we have that endpoint
			const photoCount = 0

			stats = {
				projects: projectsData.pagination?.total || 0,
				posts: postsData.pagination?.total || 0,
				albums: albumsData.pagination?.total || 0,
				photos: photoCount,
				media: mediaData.pagination?.total || 0
			}
		} catch (err) {
			error = 'Failed to load statistics'
			console.error(err)
		} finally {
			isLoading = false
		}
	}
</script>

<Page>
	<header slot="header">
		<h1>Dashboard</h1>
	</header>

	{#if isLoading}
		<div class="loading">Loading statistics...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if stats}
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon">💼</div>
				<div class="stat-content">
					<div class="stat-value">{stats.projects}</div>
					<div class="stat-label">Projects</div>
				</div>
				<a href="/admin/projects" class="stat-link">View all →</a>
			</div>

			<div class="stat-card">
				<div class="stat-icon">🌟</div>
				<div class="stat-content">
					<div class="stat-value">{stats.posts}</div>
					<div class="stat-label">Universe Posts</div>
				</div>
				<a href="/admin/posts" class="stat-link">View all →</a>
			</div>

			<div class="stat-card">
				<div class="stat-icon">📸</div>
				<div class="stat-content">
					<div class="stat-value">{stats.albums}</div>
					<div class="stat-label">Photo Albums</div>
				</div>
				<a href="/admin/albums" class="stat-link">View all →</a>
			</div>

			<div class="stat-card">
				<div class="stat-icon">🖼️</div>
				<div class="stat-content">
					<div class="stat-value">{stats.media}</div>
					<div class="stat-label">Media Files</div>
				</div>
				<a href="/admin/media" class="stat-link">View all →</a>
			</div>
		</div>

		<section class="quick-actions">
			<h2>Quick Actions</h2>
			<div class="action-grid">
				<a href="/admin/projects/new" class="action-card">
					<span class="action-icon">➕</span>
					<span>New Project</span>
				</a>
				<a href="/admin/posts/new" class="action-card">
					<span class="action-icon">✏️</span>
					<span>Write Post</span>
				</a>
				<a href="/admin/albums/new" class="action-card">
					<span class="action-icon">📷</span>
					<span>Create Album</span>
				</a>
				<a href="/admin/media" class="action-card">
					<span class="action-icon">⬆️</span>
					<span>Upload Media</span>
				</a>
			</div>
		</section>
	{/if}
</Page>

<style lang="scss">
	header {
		h1 {
			font-size: 1.75rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}

	.loading,
	.error {
		text-align: center;
		padding: $unit-6x;
		color: $grey-40;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}

	.error {
		color: #d33;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: $unit-3x;
		margin-bottom: $unit-6x;
	}

	.stat-card {
		background: $grey-95;
		border-radius: $unit-2x;
		padding: $unit-4x;
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $grey-90;
		}
	}

	.stat-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1;
		margin-bottom: $unit-half;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		color: $grey-10;
	}

	.stat-label {
		color: $grey-40;
		font-size: 0.875rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}

	.stat-link {
		color: $grey-30;
		text-decoration: none;
		font-size: 0.875rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;

		&:hover {
			color: $grey-10;
		}
	}

	.quick-actions {
		h2 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0 0 $unit-3x;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}

	.action-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: $unit-2x;
	}

	.action-card {
		background: $grey-95;
		border-radius: $unit-2x;
		padding: $unit-3x;
		text-align: center;
		text-decoration: none;
		color: $grey-20;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 0.925rem;

		&:hover {
			background-color: $grey-90;
			color: $grey-10;
		}

		.action-icon {
			font-size: 1.5rem;
		}
	}
</style>
