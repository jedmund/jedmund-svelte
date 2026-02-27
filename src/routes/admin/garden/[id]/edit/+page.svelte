<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import GardenItemForm from '$lib/components/admin/GardenItemForm.svelte'
	import { api } from '$lib/admin/api'
	import type { GardenItem } from '@prisma/client'

	let item = $state<GardenItem | null>(null)
	let isLoading = $state(true)
	let error = $state('')

	const itemId = $derived($page.params.id)

	onMount(async () => {
		try {
			const data = await api.get<GardenItem>(`/api/admin/garden/${itemId}`)
			item = data
		} catch (err) {
			error = 'Failed to load item'
			console.error(err)
		} finally {
			isLoading = false
		}
	})
</script>

<svelte:head>
	<title>{item ? `Edit ${item.title}` : 'Edit Item'} - Garden - Admin @jedmund</title>
</svelte:head>

{#if isLoading}
	<div class="loading">Loading item...</div>
{:else if error}
	<div class="error">{error}</div>
{:else if !item}
	<div class="error">Item not found</div>
{:else}
	<GardenItemForm {item} mode="edit" />
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
