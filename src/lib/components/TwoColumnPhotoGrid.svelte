<script lang="ts">
	import PhotoGrid from './PhotoGrid.svelte'
	import type { Photo } from '$lib/types/photos'

	interface Props {
		photos: Photo[]
	}

	let { photos = [] }: Props = $props()
</script>

<PhotoGrid {photos} columns={2} gap="medium" />
