<script lang="ts">
	import UniverseCard from './UniverseCard.svelte'
	import { getContentExcerpt } from '$lib/utils/content'
	import type { UniverseItem } from '../../routes/api/universe/+server'

	let { garden }: { garden: UniverseItem } = $props()

	const href = $derived(`/garden/${garden.category}/${garden.slug}`)

	const excerpt = $derived(garden.content ? getContentExcerpt(garden.content, 220) : '')

	const isContentTruncated = $derived(excerpt.endsWith('...'))

	const categoryLabel = $derived.by(() => {
		switch (garden.category) {
			case 'books':
				return 'Book'
			case 'movies':
				return 'Movie'
			case 'games':
				return 'Game'
			case 'music':
				return 'Music'
			case 'tv':
				return 'TV'
			case 'manga':
				return 'Manga'
			default:
				return garden.category ?? ''
		}
	})
</script>

<UniverseCard
	item={garden as unknown as { slug: string; publishedAt: string; [key: string]: unknown }}
	type="garden"
	{href}
>
	<div class="card-header">
		<span class="garden-eyebrow">
			{categoryLabel}{#if garden.isFavorite}&nbsp;· Favorite{/if}{#if garden.isCurrent}&nbsp;·
				Currently enjoying{/if}
		</span>
	</div>

	<div class="card-body">
		{#if garden.imageUrl}
			<a {href} class="hero-image" tabindex="-1">
				<img src={garden.imageUrl} alt={garden.title ?? ''} loading="lazy" />
			</a>
		{/if}

		<div class="card-text">
			<h2 class="card-title">
				<a {href} class="card-title-link" tabindex="-1">{garden.title}</a>
			</h2>

			{#if garden.creator}
				<p class="card-creator">{garden.creator}</p>
			{/if}

			{#if excerpt}
				<p class="card-excerpt">{excerpt}</p>
			{/if}

			{#if isContentTruncated}
				<p>
					<a {href} class="read-more" tabindex="-1">Read more</a>
				</p>
			{/if}
		</div>
	</div>
</UniverseCard>

<style lang="scss">
	.card-header {
		margin-bottom: $unit-2x;
	}

	.garden-eyebrow {
		font-size: 0.8125rem;
		font-weight: 500;
		color: $gray-40;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.card-body {
		display: flex;
		gap: $unit-3x;
		align-items: flex-start;

		@include breakpoint('phone') {
			flex-direction: column;
			gap: $unit-2x;
		}
	}

	.hero-image {
		flex-shrink: 0;
		width: 140px;
		aspect-ratio: 2 / 3;
		border-radius: $image-corner-radius;
		overflow: hidden;
		background: $gray-95;
		display: block;

		@include breakpoint('phone') {
			width: 100%;
			aspect-ratio: 16 / 9;
		}

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.card-text {
		flex: 1;
		min-width: 0;
	}

	.card-title {
		margin: 0 0 $unit-half;
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.card-creator {
		margin: 0 0 $unit-2x;
		color: $gray-40;
		font-size: 0.9375rem;
	}

	.card-excerpt {
		margin: 0;
		color: $gray-10;
		font-size: 1rem;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}

	.read-more {
		display: inline-block;
		margin-top: $unit;
		color: $red-60;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
	}
</style>
