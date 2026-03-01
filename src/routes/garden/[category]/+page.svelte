<script lang="ts">
	import Page from '$components/Page.svelte'
	import BackButton from '$components/BackButton.svelte'
	import GardenCard from '$components/GardenCard.svelte'
	import GardenSortFilter from '$components/GardenSortFilter.svelte'
	import GardenIcon from '$icons/garden.svg?component'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { browser } from '$app/environment'
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

	function handleSortChange(sort: string) {
		if (!browser) return
		const url = new URL($page.url)
		if (sort === 'display-order') {
			url.searchParams.delete('sort')
		} else {
			url.searchParams.set('sort', sort)
		}
		goto(url.toString(), { replaceState: true, keepFocus: true })
	}

	function handleBangersToggle(active: boolean) {
		if (!browser) return
		const url = new URL($page.url)
		if (active) {
			url.searchParams.set('bangers', 'true')
		} else {
			url.searchParams.delete('bangers')
		}
		goto(url.toString(), { replaceState: true, keepFocus: true })
	}
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
	{:else}
		<Page>
			{#snippet header()}
				<div class="category-header">
					<h2>{data.categoryLabel}</h2>
					<GardenSortFilter
						sort={data.sort}
						bangers={data.bangers}
						onSortChange={handleSortChange}
						onBangersToggle={handleBangersToggle}
					/>
				</div>
			{/snippet}

			{#if !data.items || data.items.length === 0}
				<p class="empty">
					{#if data.bangers}
						No bangers in this category yet.
					{:else}
						Nothing here yet.
					{/if}
				</p>
			{:else}
				<div class="items-grid">
					{#each data.items as item (item.id)}
						<GardenCard {item} showBadges={true} />
					{/each}
				</div>
			{/if}

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

	.category-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		width: 100%;
	}

	h2 {
		color: $accent-color;
		font-size: 1.2rem;
		font-weight: $font-weight-med;
		margin: 0;
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
