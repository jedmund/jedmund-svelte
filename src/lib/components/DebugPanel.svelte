<script lang="ts">
	import { dev } from '$app/environment'
</script>

{#if dev}
	{#await import('./debug/DebugPanelContent.svelte') then module}
		<module.default />
	{/await}
{/if}
