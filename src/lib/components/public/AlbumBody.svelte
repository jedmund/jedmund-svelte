<script lang="ts">
	import { renderEdraContent } from '$lib/utils/content'
	let { content, slug }: { content: unknown; slug: string } = $props()
</script>

<div class="edra-rendered-content">{@html renderEdraContent(content, { albumSlug: slug })}</div>

<style lang="scss">
	.edra-rendered-content {
		max-width: 700px;
		margin: 0 auto;

		:global(p) {
			margin: 0 0 $unit-3x;
			line-height: 1.7;
			color: $gray-20;
		}

		:global(h1),
		:global(h2),
		:global(h3),
		:global(h4) {
			margin: $unit-4x 0 $unit-2x;
			color: $gray-10;
			font-weight: 600;
		}

		:global(h1) {
			font-size: 2rem;
		}
		:global(h2) {
			font-size: 1.5rem;
		}
		:global(h3) {
			font-size: 1.25rem;
		}
		:global(h4) {
			font-size: 1.125rem;
		}

		:global(ul),
		:global(ol) {
			margin: 0 0 $unit-3x;
			padding-left: $unit-3x;
		}

		:global(ul li),
		:global(ol li) {
			margin-bottom: $unit;
			line-height: 1.7;
		}

		:global(blockquote) {
			margin: $unit-4x 0;
			padding: $unit-3x;
			background: $gray-97;
			border-left: 4px solid $gray-80;
			border-radius: $unit;
			color: $gray-30;
			font-style: italic;
		}

		:global(a) {
			color: $red-60;
			text-decoration: underline;
			transition: color 0.2s ease;
		}

		:global(a:hover) {
			color: $red-50;
		}

		:global(code) {
			background: $gray-95;
			padding: 2px 6px;
			border-radius: 3px;
			font-family: 'SF Mono', Monaco, monospace;
			font-size: 0.875em;
		}

		:global(pre) {
			background: $gray-95;
			padding: $unit-3x;
			border-radius: $unit;
			overflow-x: auto;
			margin: 0 0 $unit-3x;
		}

		:global(hr) {
			margin: $unit-4x 0;
			border: none;
			border-top: 1px solid $gray-90;
		}

		:global(figure) {
			margin: $unit-4x 0;
			text-align: center;
		}

		:global(figure img) {
			width: 100%;
			height: auto;
			border-radius: $card-corner-radius;
			display: block;
		}

		:global(figure.interactive-figure .photo-link) {
			display: block;
			text-decoration: none;
			color: inherit;
			outline: none;
			cursor: pointer;
			transition: transform 0.2s ease;
			border-radius: $card-corner-radius;
			overflow: hidden;
		}

		:global(figure.interactive-figure .photo-link:hover) {
			transform: translateY(-2px);
		}

		:global(figure.interactive-figure .photo-link:focus-visible) {
			outline: 2px solid $red-60;
			outline-offset: 4px;
		}

		:global(figure figcaption) {
			margin-top: $unit;
			font-size: 0.875rem;
			color: $gray-40;
			line-height: 1.5;
		}

		// Gallery styles
		:global(.gallery-grid) {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: $unit-2x;
			margin: $unit-4x 0;
		}

		// Geolocation styles
		:global(.geolocation-map) {
			margin: $unit-4x 0;
			border-radius: $card-corner-radius;
			overflow: hidden;
			height: 400px;
		}
	}
</style>
