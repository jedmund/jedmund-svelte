<script lang="ts">
	import { api, getErrorMessage } from '$lib/admin/api'
	import { onMount } from 'svelte'
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
			album = await api.get<Album>(`/api/albums/${albumId}`)
		} catch (err) {
			error = getErrorMessage(err, 'Failed to load album')
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
