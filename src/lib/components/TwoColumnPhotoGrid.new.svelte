<script lang="ts">
	import PhotoGrid from './PhotoGrid.new.svelte'
	import type { PhotoItem } from '$lib/types/photos'

	interface Props {
		photoItems: PhotoItem[]
		albumSlug?: string
	}

	let { photoItems = [], albumSlug }: Props = $props()
</script>

<PhotoGrid {photoItems} columns={2} gap="medium" {albumSlug} />