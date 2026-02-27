<script lang="ts">
	import Page from '$components/Page.svelte'
	import BackButton from '$components/BackButton.svelte'
	import GardenIcon from '$icons/garden.svg?component'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import StarIcon from '$icons/star.svg?component'
	import type { GardenItem } from '@prisma/client'
	import type { PageData } from './$types'

	let { data } = $props<{ data: PageData }>()

	const pageUrl = $derived($page.url.href)

	const metaTags = $derived(
		generateMetaTags({
			title: `${data.categoryLabel} — Garden`,
			description: `My favorite ${data.categoryLabel?.toLowerCase()}.`,
			url: pageUrl,
			titleFormat: { type: 'default' }
		})
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
	{#if data.error}
		<Page>
			<p class="error">Category not found.</p>
		</Page>
	{:else if !data.items || data.items.length === 0}
		<Page>
			{#snippet header()}
				<h2>{data.categoryLabel}</h2>
			{/snippet}
			<p class="empty">Nothing here yet.</p>
		</Page>
	{:else}
		<Page>
			{#snippet header()}
				<h2>{data.categoryLabel}</h2>
			{/snippet}

			<div class="items-grid">
				{#each data.items as item (item.id)}
					<a href="/garden/{item.category}/{item.slug}" class="garden-card" style="--hover-rotate: {(Math.random() * 3 - 1.5).toFixed(1)}deg">
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
							<div class="badges">
								{#if item.isCurrent}
									<span class="badge current">Currently enjoying</span>
								{/if}
								{#if item.isFavorite}
									<span class="badge favorite">Banger</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>

			<footer class="page-footer">
				<BackButton href="/garden" label="Back to Garden" />
				<GardenIcon class="footer-icon" />
			</footer>
		</Page>
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
		transition: transform 0.2s ease, box-shadow 0.2s ease;

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

	.badges {
		display: flex;
		gap: $unit-half;
		flex-wrap: wrap;
	}

	.badge {
		font-size: $font-size-extra-small;
		font-weight: $font-weight-med;
		padding: 2px $unit;
		border-radius: $unit;
		width: fit-content;

		&.current {
			background-color: $green-95;
			color: $green-40;
		}

		&.favorite {
			background-color: $blue-95;
			color: $blue-40;
		}
	}

	.page-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;

		:global(.footer-icon) {
			width: 24px;
			height: 24px;
			color: $gray-40;
		}
	}

	.empty,
	.error {
		text-align: center;
		color: $gray-40;
		padding: $unit-6x;
	}
</style>
