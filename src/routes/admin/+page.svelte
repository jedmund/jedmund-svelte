<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'

	onMount(() => {
		goto('/admin/projects', { replaceState: true })
	})
</script>

<svelte:head>
	<title>Admin @jedmund</title>
</svelte:head>
