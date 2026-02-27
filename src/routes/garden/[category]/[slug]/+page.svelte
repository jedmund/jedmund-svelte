<script lang="ts">
	import Page from '$components/Page.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { renderEdraContent } from '$lib/utils/content'
	import { getCreatorLabel } from '$lib/constants/garden'
	import { page } from '$app/stores'
	import type { PageData } from './$types'

	let { data } = $props<{ data: PageData }>()

	const pageUrl = $derived($page.url.href)

	const metaTags = $derived(
		data.item
			? generateMetaTags({
					title: data.item.title,
					description: data.item.creator
						? `${data.item.title} by ${data.item.creator}`
						: data.item.title,
					image: data.item.imageUrl || undefined,
					url: pageUrl,
					titleFormat: { type: 'default' }
				})
			: generateMetaTags({ title: 'Not Found', url: pageUrl })
	)

	const renderedNote = $derived(data.item?.note ? renderEdraContent(data.item.note) : '')
	const creatorLabel = $derived(data.item ? getCreatorLabel(data.item.category) : 'Creator')
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
	{#if data.error || !data.item}
		<Page>
			<p class="error">{data.error || 'Item not found.'}</p>
		</Page>
	{:else}
		<Page>
			{#snippet header()}
				<div class="page-header">
					<a href="/garden/{data.item.category}" class="back-link">&larr; {data.categoryLabel}</a>
				</div>
			{/snippet}

			<div class="item-detail">
				{#if data.item.imageUrl}
					<div class="item-cover">
						<img src={data.item.imageUrl} alt={data.item.title} />
					</div>
				{/if}

				<div class="item-meta">
					<h1>{data.item.title}</h1>

					{#if data.item.creator}
						<p class="item-creator">{creatorLabel}: {data.item.creator}</p>
					{/if}

					<div class="badges">
						{#if data.item.isCurrent}
							<span class="badge current">Currently enjoying</span>
						{/if}
						{#if data.item.isFavorite}
							<span class="badge favorite">All-time favorite</span>
						{/if}
					</div>

					{#if data.item.url}
						<a href={data.item.url} target="_blank" rel="noopener noreferrer" class="external-link">
							Visit &rarr;
						</a>
					{/if}
				</div>

				{#if renderedNote}
					<div class="item-note">
						{@html renderedNote}
					</div>
				{/if}
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

	.item-detail {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
	}

	.item-cover {
		width: 200px;
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

	.item-meta {
		display: flex;
		flex-direction: column;
		gap: $unit;

		h1 {
			font-size: 1.5rem;
			font-weight: 600;
			margin: 0;
			color: $gray-00;
		}
	}

	.item-creator {
		font-size: 1rem;
		color: $gray-30;
		margin: 0;
	}

	.badges {
		display: flex;
		gap: $unit;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.8125rem;
		font-weight: 500;
		padding: $unit-half $unit;
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

	.external-link {
		font-size: 0.875rem;
		color: $accent-color;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.item-note {
		font-size: 1rem;
		line-height: 1.6;
		color: $gray-10;

		:global(p) {
			margin-bottom: $unit-2x;
		}

		:global(p:last-child) {
			margin-bottom: 0;
		}

		:global(a) {
			color: $accent-color;
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}
		}

		:global(strong) {
			font-weight: 600;
		}
	}

	.error {
		text-align: center;
		color: $gray-40;
		padding: $unit-6x;
	}
</style>
