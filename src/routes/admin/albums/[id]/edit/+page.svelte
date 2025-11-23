<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import AlbumForm from '$lib/components/admin/AlbumForm.svelte'
	import type { Album } from '@prisma/client'

	let album = $state<Album | null>(null)
	let isLoading = $state(true)
	let error = $state('')

	const albumId = $derived($page.params.id)

	onMount(async () => {
		await loadAlbum()
	})

	async function loadAlbum() {
		try {
			const response = await fetch(`/api/albums/${albumId}`, {
				credentials: 'same-origin'
			})

			if (!response.ok) {
				if (response.status === 401) {
					goto('/admin/login')
					return
				}
				throw new Error('Failed to load album')
			}

			const data = await response.json()
			album = data
		} catch (err) {
			error = 'Failed to load album'
			console.error(err)
		} finally {
			isLoading = false
		}
	}
</script>

<svelte:head>
	<title>{album ? `Edit ${album.title}` : 'Edit Album'} - Admin @jedmund</title>
</svelte:head>

{#if isLoading}
	<div class="loading">Loading album...</div>
{:else if error}
	<div class="error">{error}</div>
{:else if !album}
	<div class="error">Album not found</div>
{:else}
	<AlbumForm {album} mode="edit" />
{/if}

<style lang="scss">
	.loading,
	.error {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
	}

	.error {
		color: #d33;
	}
</style>
