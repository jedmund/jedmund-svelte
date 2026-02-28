<script lang="ts">
	import Page from '$components/Page.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { GARDEN_CATEGORIES, getCategoryLabel } from '$lib/constants/garden'
	import type { GardenItem } from '@prisma/client'
	import StarIcon from '$icons/star.svg?component'
	import type { PageData } from './$types'

	let { data } = $props<{ data: PageData }>()

	const pageUrl = $derived($page.url.href)

	const metaTags = $derived(
		generateMetaTags({
			title: 'Garden',
			description:
				'A curated collection of books, movies, music, games, shows, and devices that I enjoy.',
			url: pageUrl,
			titleFormat: { type: 'default' }
		})
	)

	// Group items by category
	const itemsByCategory = $derived.by(() => {
		const groups: Record<string, GardenItem[]> = {}
		for (const item of data.items as GardenItem[]) {
			if (!groups[item.category]) {
				groups[item.category] = []
			}
			groups[item.category].push(item)
		}
		return groups
	})

	// Only show categories that have items, in defined order
	const activeCategories = $derived(
		GARDEN_CATEGORIES.filter((c) => itemsByCategory[c.value]?.length > 0)
	)
</script>

<svelte:head>
	<title>{metaTags.title}</title>
	<meta name="description" content={metaTags.description} />

	{#each Object.entries(metaTags.openGraph) as [property, content]}
		<meta property="og:{property}" {content} />
	{/each}

	{#each Object.entries(metaTags.twitter) as [property, content]}
		<meta name="twitter:{property}" {content} />
	{/each}

	<link rel="canonical" href={metaTags.other.canonical} />
</svelte:head>

<section class="garden-container">
	{#if activeCategories.length === 0}
		<Page>
			<p class="empty">Nothing here yet.</p>
		</Page>
	{:else}
		{#each activeCategories as cat}
			<Page>
				{#snippet header()}
					<h2>
						<a href="/garden/{cat.value}">{cat.label}</a>
					</h2>
				{/snippet}

				<div class="items-grid">
					{#each itemsByCategory[cat.value] as item}
						<a
							href="/garden/{item.category}/{item.slug}"
							class="garden-card"
							style="--hover-rotate: {(Math.random() * 3 - 1.5).toFixed(1)}deg"
						>
							{#if item.imageUrl}
								<div class="card-image">
									<img src={item.imageUrl} alt={item.title} />
								</div>
							{/if}
							<div class="card-info">
								<h3>{item.title}</h3>
								{#if item.creator}
									<span class="card-creator">{item.creator}</span>
								{/if}
								{#if item.rating}
									<div class="star-rating">
										{#each { length: item.rating } as _}
											<StarIcon />
										{/each}
									</div>
								{/if}
							</div>
						</a>
					{/each}
				</div>

				{#if itemsByCategory[cat.value].length > 6}
					<a href="/garden/{cat.value}" class="view-all">View all {cat.label.toLowerCase()}</a>
				{/if}
			</Page>
		{/each}
	{/if}
</section>

<style lang="scss">
	.garden-container {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		justify-content: center;
		max-width: 700px;
		margin: 0 auto;

		@include breakpoint('phone') {
			padding: 0 $unit-2x;
		}

		:global(.page) {
			margin: 0;
		}
	}

	h2 {
		color: $accent-color;
		font-size: 1.2rem;
		font-weight: $font-weight-med;
		margin: 0;
		padding-bottom: $unit;

		a {
			color: inherit;
			text-decoration: none;

			&:hover {
				text-decoration: underline;
				text-decoration-style: wavy;
			}
		}
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: $unit-4x;

		@include breakpoint('phone') {
			grid-template-columns: repeat(2, 1fr);
			gap: $unit-3x;
		}
	}

	.garden-card {
		display: flex;
		flex-direction: column;
		gap: $unit;
		text-decoration: none;
		color: inherit;
		border-radius: $unit;
	}

	.card-image {
		width: 100%;
		border-radius: $unit;
		overflow: hidden;
		background-color: $gray-90;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;

		img {
			width: 100%;
			height: auto;
			display: block;
		}
	}

	.garden-card:hover .card-image {
		transform: scale3d(1.03, 1.03, 1.03) rotate(var(--hover-rotate, 0deg));
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.card-info {
		display: flex;
		flex-direction: column;
		gap: $unit-half;

		h3 {
			font-size: 0.9375rem;
			font-weight: $font-weight-bold;
			margin: 0;
			color: $gray-10;
		}
	}

	.card-creator {
		font-size: 0.8125rem;
		color: $gray-40;
	}

	.star-rating {
		display: flex;
		gap: 2px;

		:global(svg) {
			width: 14px;
			height: 14px;
			fill: $red-50;
		}
	}

	.view-all {
		display: block;
		margin-top: $unit;
		font-size: $font-size-small;
		color: $accent-color;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.empty {
		text-align: center;
		color: $gray-40;
		padding: $unit-6x;
	}
</style>
