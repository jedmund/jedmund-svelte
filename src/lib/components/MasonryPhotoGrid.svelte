<script lang="ts">
	import PhotoGrid from './PhotoGrid.svelte'
	import type { Photo } from '$lib/types/photos'

	interface Props {
		photos: Photo[]
		columns?: 1 | 2 | 3 | 'auto'
	}

	let { photos = [], columns = 'auto' }: Props = $props()
</script>

<PhotoGrid {photos} {columns} masonry={true} gap="medium" />
