<script lang="ts">
	import Page from '$components/Page.svelte'
	import PostList from '$components/PostList.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
</script>

<svelte:head>
	<title>Blog - jedmund</title>
	<meta name="description" content="Thoughts on design, development, and everything in between." />
</svelte:head>

<div class="blog-container">
	<PostList posts={data.posts} />
</div>

<style lang="scss">
	.blog-container {
		max-width: 784px;
		margin: $unit-6x auto;
		padding: 0 $unit-5x;

		@include breakpoint('phone') {
			margin-top: $unit-3x;
			margin-bottom: $unit-3x;
			padding: 0 $unit-3x;
		}

		@include breakpoint('small-phone') {
			padding: 0 $unit-2x;
		}
	}
</style>
