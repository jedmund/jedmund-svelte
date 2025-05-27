<script lang="ts">
	import PhotoGrid from '$components/PhotoGrid.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const photoItems = $derived(data.photoItems)
</script>

<PhotoGrid {photoItems} />

<style lang="scss">
	:global(main) {
		padding: 0;
	}
</style>
