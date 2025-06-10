<script lang="ts">
	import UniverseFeed from '$components/UniverseFeed.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
</script>

<svelte:head>
	<title>Universe - jedmund</title>
	<meta name="description" content="A mixed feed of posts, thoughts, and photo albums." />
</svelte:head>

<div class="universe-container">
	{#if data.error}
		<div class="error-message">
			<p>{data.error}</p>
		</div>
	{:else}
		<UniverseFeed items={data.universeItems || []} />
	{/if}
</div>

<style lang="scss">
	.universe-container {
		max-width: 784px;
		margin: 0 auto;
		padding: 0;
	}

	.error-message {
		text-align: center;
		padding: $unit-6x $unit-3x;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: $unit-2x;
		color: #dc2626;

		p {
			margin: 0;
			font-size: 1rem;
		}
	}
</style>
