<script lang="ts">
	import Slideshow from './Slideshow.svelte'

	let {
		images = [],
		alt = ''
	}: {
		images: string[]
		alt?: string
	} = $props()

	// Convert string array to slideshow items
	const slideshowItems = $derived(images.map((url) => ({ url, alt })))
</script>

<Slideshow items={slideshowItems} {alt} aspectRatio="4/3" />
