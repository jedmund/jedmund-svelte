<script lang="ts">
	import StarIcon from '$icons/star.svg?component'
	import { hydrateContent } from '$lib/utils/hydrate-content'
	let {
		renderedNote,
		rating,
		isFavorite
	}: { renderedNote: string; rating: number | null; isFavorite: boolean } = $props()

	let noteEl: HTMLDivElement | undefined = $state()
	$effect(() => {
		if (noteEl && renderedNote) return hydrateContent(noteEl)
	})
</script>

{#if renderedNote || rating}
	<div class="item-thoughts">
		<h2 class="thoughts-label">Thoughts</h2>
		{#if renderedNote}
			<div class="item-note" bind:this={noteEl}>
				{@html renderedNote}
			</div>
		{/if}
		{#if rating}
			<div class="star-rating">
				{#each { length: rating } as _}
					<StarIcon />
				{/each}
			</div>
		{/if}
		{#if isFavorite}
			<p class="banger-label">A certified banger</p>
		{/if}
	</div>
{/if}

<style lang="scss">
	.item-thoughts {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		padding-top: $unit-half;
	}

	.thoughts-label {
		font-size: $font-size;
		font-weight: $font-weight-bold;
		color: $red-50;
		margin: 0;
	}

	.banger-label {
		font-size: $font-size;
		font-weight: $font-weight-med;
		color: $red-50;
		margin: 0;
	}

	.star-rating {
		display: flex;
		gap: 2px;

		:global(svg) {
			width: 18px;
			height: 18px;
			fill: $red-50;
		}
	}

	.item-note {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		font-size: $font-size;
		line-height: 1.6;
		color: $gray-10;

		> :global(:first-child) {
			margin-top: 0;
		}

		:global(p) {
			margin: 0;
		}

		:global(h1) {
			margin: 0;
			margin-top: $unit-2x;
			font-size: 2rem;
			font-weight: $font-weight-bold;
			color: $text-color;
		}

		:global(h2) {
			margin: 0;
			margin-top: $unit;
			font-size: 1.5rem;
			font-weight: $font-weight-bold;
			color: $text-color;
		}

		:global(h3) {
			margin: 0;
			font-size: $font-size-med;
			font-weight: $font-weight-bold;
			color: $text-color;
		}

		:global(h4) {
			margin: 0;
			font-size: $font-size;
			font-weight: $font-weight-bold;
			color: $text-color;
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
				font-size: $font-size-small;
			}
		}

		:global(a) {
			color: $accent-color;
			text-decoration: none;

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
			font-weight: $font-weight-bold;
			color: $text-color;
		}

		:global(figure) {
			margin: 0;
			margin-top: $unit;

			:global(img),
			:global(video) {
				width: 100%;
				height: auto;
				border-radius: $unit;
			}
		}
	}
</style>
