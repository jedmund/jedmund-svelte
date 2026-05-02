<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import { api } from '$lib/admin/api'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import PostForm from '$lib/components/admin/forms/PostForm.svelte'
	import type { ApiPost } from '$lib/components/admin/forms/post-types'

	let post = $state<ApiPost | null>(null)
	let loading = $state(true)
	let loadError = $state('')

	async function loadPost() {
		loading = true
		loadError = ''
		const id = $page.params.id

		if (!id) {
			loadError = 'No post ID provided'
			loading = false
			return
		}

		try {
			const data = await api.get<ApiPost>(`/api/posts/${id}`)
			if (data) {
				post = data
			} else {
				loadError = 'Post not found'
			}
		} catch {
			loadError = 'Network error occurred while loading post'
		} finally {
			loading = false
		}
	}

	onMount(loadPost)
</script>

{#if loading}
	<div class="loading-container">
		<LoadingSpinner />
	</div>
{:else if loadError}
	<div class="error-container">
		<h2>Error Loading Post</h2>
		<p>{loadError}</p>
		<button class="btn btn-primary" onclick={loadPost}>Try Again</button>
	</div>
{:else if post}
	<PostForm initialPost={post} />
{:else}
	<div class="error">Post not found</div>
{/if}

<style lang="scss">
	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.error-container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 400px;
		text-align: center;
		gap: $unit-2x;

		h2 {
			color: $gray-20;
			margin: 0;
		}

		p {
			color: $gray-40;
			margin: 0;
		}
	}

	.error {
		text-align: center;
		color: $gray-40;
		padding: 2rem;
	}
</style>
