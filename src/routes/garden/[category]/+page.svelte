<script lang="ts">
	import Page from '$components/Page.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
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
				<div class="page-header">
					<a href="/garden" class="back-link">&larr; Garden</a>
					<h2>{data.categoryLabel}</h2>
				</div>
			{/snippet}

			<div class="items-grid">
				{#each data.items as item (item.id)}
					<a href="/garden/{item.category}/{item.slug}" class="garden-card">
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
							<div class="badges">
								{#if item.isCurrent}
									<span class="badge current">Currently enjoying</span>
								{/if}
								{#if item.isFavorite}
									<span class="badge favorite">Favorite</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
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

	.page-header {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.back-link {
		font-size: 0.875rem;
		color: $gray-40;
		text-decoration: none;

		&:hover {
			color: $accent-color;
		}
	}

	h2 {
		color: $accent-color;
		font-size: 1.2rem;
		font-weight: 500;
		margin: 0;
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: $unit-2x;
	}

	.garden-card {
		display: flex;
		flex-direction: column;
		gap: $unit;
		text-decoration: none;
		color: inherit;
		border-radius: $unit;
		transition: transform 0.2s ease;

		&:hover {
			transform: translateY(-2px);
		}
	}

	.card-image {
		width: 100%;
		aspect-ratio: 1;
		border-radius: $unit;
		overflow: hidden;
		background-color: $gray-90;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.card-info {
		display: flex;
		flex-direction: column;
		gap: $unit-half;

		h3 {
			font-size: 0.9375rem;
			font-weight: 600;
			margin: 0;
			color: $gray-10;
		}
	}

	.card-creator {
		font-size: 0.8125rem;
		color: $gray-40;
	}

	.badges {
		display: flex;
		gap: $unit-half;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 2px $unit;
		border-radius: $unit;
		width: fit-content;

		&.current {
			background-color: $green-95;
			color: $green-40;
		}

		&.favorite {
			background-color: $yellow-95;
			color: $yellow-40;
		}
	}

	.empty,
	.error {
		text-align: center;
		color: $gray-40;
		padding: $unit-6x;
	}
</style>
