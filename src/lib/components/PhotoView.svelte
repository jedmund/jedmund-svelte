<script lang="ts">
	import Zoom from 'svelte-medium-image-zoom'
	import 'svelte-medium-image-zoom/dist/styles.css'

	interface Props {
		src: string
		alt?: string
		title?: string
		id?: string
		class?: string
	}

	let { src, alt = '', title, id, class: className = '' }: Props = $props()
</script>

<div class="photo-view {className}">
	{#key id || src}
		<Zoom>
			<img {src} alt={title || alt || 'Photo'} class="photo-image" />
		</Zoom>
	{/key}
</div>

<style lang="scss">
	@import '$styles/variables.scss';
	@import '$styles/mixins.scss';

	.photo-view {
		display: flex;
		justify-content: center;
		font-size: 0;
		line-height: 0;
		position: relative;
		z-index: 1;
	}

	.photo-image {
		display: block;
		width: 100%;
		height: auto;
		max-width: 700px;
		object-fit: contain;
		border-radius: $image-corner-radius;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

		@include breakpoint('phone') {
			border-radius: $image-corner-radius;
		}
	}

	// Hide the zoom library's close button
	:global([data-smiz-btn-unzoom]) {
		display: none !important;
	}
</style>