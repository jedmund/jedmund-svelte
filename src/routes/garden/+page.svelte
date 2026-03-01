<script lang="ts">
	import Page from '$components/Page.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import CategoryBookIcon from '$icons/category-book.svg?component'
	import CategoryGameIcon from '$icons/category-game.svg?component'
	import CategoryMangaIcon from '$icons/category-manga.svg?component'
	import CategoryMovieIcon from '$icons/category-movie.svg?component'
	import CategoryMusicIcon from '$icons/category-music.svg?component'
	import CategoryTVIcon from '$icons/category-tv.svg?component'
	import CategoryDeviceIcon from '$icons/category-device.svg?component'
	import CategoryOtherIcon from '$icons/category-other.svg?component'
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

	const CATEGORY_ICONS: Record<string, typeof CategoryBookIcon> = {
		books: CategoryBookIcon,
		games: CategoryGameIcon,
		manga: CategoryMangaIcon,
		movies: CategoryMovieIcon,
		music: CategoryMusicIcon,
		'tv-shows': CategoryTVIcon,
		devices: CategoryDeviceIcon,
		other: CategoryOtherIcon
	}

	const isEmpty = $derived(
		data.currentItems.length === 0 &&
			data.favoriteItems.length === 0 &&
			data.recentItems.length === 0
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
	{#if isEmpty}
		<Page>
			<p class="empty">Nothing here yet.</p>
		</Page>
	{/if}

	{#if data.currentItems.length > 0}
		<Page>
			{#snippet header()}
				<h2>Currently enjoying</h2>
			{/snippet}

			<div class="items-grid">
				{#each data.currentItems.slice(0, 5) as item (item.id)}
					<a href="/garden/{item.category}/{item.slug}" class="cover-link">
						{#if item.imageUrl}
							<img src={item.imageUrl} alt={item.title} />
						{/if}
					</a>
				{/each}
			</div>
		</Page>
	{/if}

	{#if data.favoriteItems.length > 0}
		<Page>
			{#snippet header()}
				<h2>Bangers</h2>
			{/snippet}

			<div class="items-grid">
				{#each data.favoriteItems.slice(0, 5) as item (item.id)}
					<a href="/garden/{item.category}/{item.slug}" class="cover-link">
						{#if item.imageUrl}
							<img src={item.imageUrl} alt={item.title} />
						{/if}
					</a>
				{/each}
			</div>
		</Page>
	{/if}

	{#if data.recentItems.length > 0}
		<Page>
			{#snippet header()}
				<h2>Recently added</h2>
			{/snippet}

			<div class="items-grid">
				{#each data.recentItems.slice(0, 5) as item (item.id)}
					<a href="/garden/{item.category}/{item.slug}" class="cover-link">
						{#if item.imageUrl}
							<img src={item.imageUrl} alt={item.title} />
						{/if}
					</a>
				{/each}
			</div>
		</Page>
	{/if}

	{#if data.activeCategories.length > 0}
		<Page>
			{#snippet header()}
				<h2>Browse</h2>
			{/snippet}

			<div class="category-grid">
				{#each data.activeCategories as cat}
					{@const CatIcon = CATEGORY_ICONS[cat.value]}
					<a href="/garden/{cat.value}" class="category-card">
						{#if CatIcon}
							<CatIcon />
						{/if}
						<span class="category-label">{cat.label}</span>
						<span class="category-count">{cat.count}</span>
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

	h2 {
		color: $accent-color;
		font-size: 1.2rem;
		font-weight: $font-weight-med;
		margin: 0;
		padding-bottom: $unit;
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		align-items: end;
		gap: $unit-2x;

		@include breakpoint('phone') {
			grid-template-columns: repeat(3, 1fr);
			gap: $unit;
		}
	}

	.cover-link {
		display: block;
		border-radius: $unit;
		overflow: hidden;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;

		img {
			width: 100%;
			height: auto;
			display: block;
		}

		&:hover {
			transform: scale3d(1.05, 1.05, 1.05);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		}
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: $unit-2x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}
	}

	.category-card {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-2x $unit-3x;
		background: $green-90;
		border-radius: $corner-radius-2xl;
		text-decoration: none;
		color: $green-10;
		transition:
			background $transition-fast ease,
			transform $transition-fast ease;

		&:hover {
			background: $green-80;
			transform: translateY(-2px);
		}

		:global(svg) {
			width: 24px;
			height: 24px;
			flex-shrink: 0;
			color: $green-30;
		}
	}

	.category-label {
		font-size: $font-size-small;
		font-weight: $font-weight-bold;
	}

	.category-count {
		margin-left: auto;
		font-size: $font-size-small;
		color: $green-40;
	}

	.empty {
		text-align: center;
		color: $gray-40;
		padding: $unit-6x;
	}
</style>
