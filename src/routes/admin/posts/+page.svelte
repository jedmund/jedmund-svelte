<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import DataTable from '$lib/components/admin/DataTable.svelte'
	import PostDropdown from '$lib/components/admin/PostDropdown.svelte'

	interface Post {
		id: number
		slug: string
		postType: string
		title: string | null
		excerpt: string | null
		status: string
		tags: string[] | null
		publishedAt: string | null
		createdAt: string
		updatedAt: string
	}

	let posts = $state<Post[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let total = $state(0)
	let postTypeCounts = $state<Record<string, number>>({})

	const postTypeIcons: Record<string, string> = {
		blog: '📝',
		microblog: '💭',
		link: '🔗',
		photo: '📷',
		album: '🖼️'
	}

	const postTypeLabels: Record<string, string> = {
		blog: 'Blog Post',
		microblog: 'Microblog',
		link: 'Link',
		photo: 'Photo',
		album: 'Album'
	}

	const columns = [
		{
			key: 'title',
			label: 'Title',
			width: '40%',
			render: (post: Post) => {
				if (post.title) {
					return post.title
				}
				// For posts without titles, show excerpt or type
				if (post.excerpt) {
					return post.excerpt.substring(0, 50) + '...'
				}
				return `(${postTypeLabels[post.postType] || post.postType})`
			}
		},
		{
			key: 'postType',
			label: 'Type',
			width: '15%',
			render: (post: Post) => {
				const icon = postTypeIcons[post.postType] || '📄'
				const label = postTypeLabels[post.postType] || post.postType
				return `${icon} ${label}`
			}
		},
		{
			key: 'status',
			label: 'Status',
			width: '15%',
			render: (post: Post) => {
				return post.status === 'published' ? '🟢 Published' : '⚪ Draft'
			}
		},
		{
			key: 'publishedAt',
			label: 'Published',
			width: '15%',
			render: (post: Post) => {
				if (!post.publishedAt) return '—'
				return new Date(post.publishedAt).toLocaleDateString()
			}
		},
		{
			key: 'updatedAt',
			label: 'Updated',
			width: '15%',
			render: (post: Post) => {
				return new Date(post.updatedAt).toLocaleDateString()
			}
		}
	]

	onMount(async () => {
		await loadPosts()
	})

	async function loadPosts() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch('/api/posts', {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				if (response.status === 401) {
					goto('/admin/login')
					return
				}
				throw new Error('Failed to load posts')
			}

			const data = await response.json()
			posts = data.posts || []
			total = data.pagination?.total || posts.length

			// Calculate post type counts
			const counts: Record<string, number> = {}
			posts.forEach((post) => {
				counts[post.postType] = (counts[post.postType] || 0) + 1
			})
			postTypeCounts = counts
		} catch (err) {
			error = 'Failed to load posts'
			console.error(err)
		} finally {
			isLoading = false
		}
	}

	function handleRowClick(post: Post) {
		goto(`/admin/posts/${post.id}/edit`)
	}
</script>

<AdminPage>
	<header slot="header">
		<h1>Posts</h1>
		<div class="header-actions">
			<PostDropdown />
		</div>
	</header>

	{#if error}
		<div class="error">{error}</div>
	{:else}
		<div class="posts-stats">
			<div class="stat">
				<span class="stat-value">{total}</span>
				<span class="stat-label">Total posts</span>
			</div>
			{#each Object.entries(postTypeCounts) as [type, count]}
				<div class="stat">
					<span class="stat-value">{count}</span>
					<span class="stat-label">{postTypeLabels[type] || type}</span>
				</div>
			{/each}
		</div>

		<DataTable
			data={posts}
			{columns}
			loading={isLoading}
			emptyMessage="No posts found. Create your first post!"
			onRowClick={handleRowClick}
		/>
	{/if}
</AdminPage>

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;

		h1 {
			font-size: 1.75rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
			}
	}

	.header-actions {
		display: flex;
		gap: $unit-2x;
	}

	.btn {
		padding: $unit-2x $unit-3x;
		border-radius: 50px;
		text-decoration: none;
		font-size: 0.925rem;
		transition: all 0.2s ease;

		&.btn-primary {
			background-color: $grey-10;
			color: white;

			&:hover {
				background-color: $grey-20;
			}
		}
	}

	.error {
		text-align: center;
		padding: $unit-6x;
		color: #d33;
	}

	.posts-stats {
		display: flex;
		gap: $unit-4x;
		margin-bottom: $unit-4x;
		flex-wrap: wrap;

		.stat {
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.stat-value {
				font-size: 1.5rem;
				font-weight: 700;
				color: $grey-10;
					}

			.stat-label {
				font-size: 0.875rem;
				color: $grey-40;
					}
		}
	}
</style>
