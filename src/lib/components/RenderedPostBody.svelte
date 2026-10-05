<script lang="ts">
	import { hydrateContent } from '$lib/utils/hydrate-content'
	let { html, essay = false }: { html: string; essay?: boolean } = $props()
	let element: HTMLDivElement | undefined = $state()
	$effect(() => {
		if (element && html) return hydrateContent(element)
	})
</script>

<div class="post-body" class:essay bind:this={element}>{@html html}</div>

<style lang="scss">
	.post-body {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		color: $text-color;
		line-height: 1.5;
		font-size: 1rem;
		&.essay {
			line-height: 1.4;
		}

		> :global(:first-child) {
			margin-top: 0;
		}

		:global(figcaption:empty) {
			display: none;
		}

		:global(h1) {
			margin: 0;
			margin-top: $unit-2x;
			font-size: 2rem;
			font-weight: 600;
			color: $text-color;
		}

		:global(h2) {
			margin: 0;
			margin-top: $unit;
			font-size: 1.5rem;
			font-weight: 600;
			color: $text-color;
		}

		:global(h3) {
			margin: 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: $text-color;
		}

		:global(h4) {
			margin: 0;
			font-size: 1rem;
			font-weight: 600;
			color: $text-color;
		}

		:global(p) {
			margin: 0;
		}

		:global(ul),
		:global(ol) {
			display: flex;
			flex-direction: column;
			gap: $unit;
			margin: 0;
			padding-left: $unit-3x;
		}

		:global(ul li),
		:global(ol li) {
			:global(p) {
				margin: 0;
			}
		}

		:global(blockquote) {
			display: flex;
			flex-direction: column;
			gap: $unit-2x;
			margin: 0;
			margin-top: $unit;
			padding: $unit-3x;
			background: $gray-97;
			border-left: 4px solid $gray-80;
			border-radius: $unit;
			color: $text-color;
			font-style: italic;
		}

		:global(code) {
			background: $gray-95;
			padding: 2px 6px;
			border-radius: 4px;
			font-family:
				'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
			font-size: 0.9em;
			color: $text-color;
		}

		:global(pre) {
			background: $gray-95;
			padding: $unit-3x;
			border-radius: $unit;
			overflow-x: auto;
			margin: 0;
			border: 1px solid $gray-85;

			:global(code) {
				background: none;
				padding: 0;
				font-size: 0.875rem;
			}
		}

		:global(a) {
			color: $red-60;
			text-decoration: none;
			transition: all 0.2s ease;

			&:hover {
				text-decoration: underline;
			}
		}

		:global(hr) {
			border: none;
			border-top: 1px solid $gray-85;
			margin: 0;
			margin-top: $unit;
		}

		:global(em) {
			font-style: italic;
		}

		:global(strong) {
			font-weight: 600;
			color: $text-color;
		}

		:global(figure) {
			margin: 0;
			margin-top: $unit;

			:global(img),
			:global(video) {
				width: 100%;
				height: auto;
				border-radius: $corner-radius;
			}
		}

		:global(.audio-figure) {
			margin: 0;

			:global(figcaption) {
				font-size: $font-size-extra-small;
				color: $gray-40;
				margin-top: $unit;
				padding: 0 $unit-2x;
			}
		}

		// URL Embed styles
		:global(.url-embed-rendered) {
			margin: 0;
			width: 100%;
		}

		:global(.url-embed-link) {
			display: flex;
			flex-direction: column;
			background: $gray-97;
			border-radius: $card-corner-radius;
			overflow: hidden;
			border: 1px solid $gray-80;
			text-decoration: none;
			transition: all 0.2s ease;
			width: 100%;

			&:hover {
				border-color: $gray-80;
				transform: translateY(-1px);
				text-decoration: none;
				box-shadow: 0 0px 8px rgba(0, 0, 0, 0.08);
			}
		}

		:global(.url-embed-image) {
			width: 100%;
			aspect-ratio: 2 / 1;
			overflow: hidden;
			background: $gray-90;
		}

		:global(.url-embed-image img) {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		:global(.url-embed-text) {
			flex: 1;
			padding: $unit-2x $unit-3x $unit-3x;
			display: flex;
			flex-direction: column;
			gap: $unit;
			min-width: 0;
		}

		:global(.url-embed-meta) {
			display: flex;
			align-items: center;
			gap: $unit-half;
			font-size: 0.8125rem;
			color: $gray-40;
		}

		:global(.url-embed-favicon) {
			width: 16px;
			height: 16px;
			flex-shrink: 0;
		}

		:global(.url-embed-domain) {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			text-transform: lowercase;
		}

		:global(.url-embed-title) {
			margin: 0;
			font-size: 1.125rem;
			font-weight: 600;
			color: $gray-10;
			line-height: 1.3;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			overflow: hidden;
		}

		:global(.url-embed-description) {
			margin: 0;
			font-size: 0.9375rem;
			color: $gray-30;
			line-height: 1.5;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 3;
			line-clamp: 3;
			overflow: hidden;
		}

		// YouTube embed styles
		:global(.url-embed-youtube) {
			margin: 0;
			border-radius: $card-corner-radius;
			overflow: hidden;
			background: $gray-95;
		}

		:global(.youtube-embed-wrapper) {
			position: relative;
			padding-bottom: 56.25%; // 16:9 aspect ratio
			height: 0;
			overflow: hidden;
		}

		:global(.youtube-embed-wrapper iframe) {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			border: none;
		}
	}
</style>
