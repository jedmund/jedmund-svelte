<script lang="ts">
	import PostsPage from '../posts/+page.svelte'
	import type { PageData } from '../posts/$types'

	export let data: PageData
	export let form: { message?: string } | undefined
</script>

<PostsPage {data} {form} />
