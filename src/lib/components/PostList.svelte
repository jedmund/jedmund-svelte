<script lang="ts">
	import type { Post } from '$lib/posts'
	import PostItem from './PostItem.svelte'

	let { posts }: { posts: Post[] } = $props()
</script>

<div class="post-list">
	{#if posts && posts.length > 0}
		{#each posts as post}
			<PostItem {post} />
		{/each}
	{:else}
		<p>No posts found.</p>
	{/if}
</div>

<style lang="scss">
	.post-list {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
	}
</style>
