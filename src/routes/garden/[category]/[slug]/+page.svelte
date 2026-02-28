<script lang="ts">
	import Page from '$components/Page.svelte'
	import BackButton from '$components/BackButton.svelte'
	import HeartButton from '$components/HeartButton.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { renderEdraContent } from '$lib/utils/content'
	import { formatDate } from '$lib/utils/date'
	import StarIcon from '$icons/star.svg?component'
	import CheckboxIcon from '$icons/checkbox-checked.svg?component'
	import PlayIcon from '$icons/play.svg?component'
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

	const renderedNote = $derived(
		data.item?.note ? renderEdraContent(data.item.note).replace(/(<p><br><\/p>\s*)+$/, '') : ''
	)
	const dateStr = $derived(data.item?.date ? data.item.date.toString() : '')
	const year = $derived.by(() => {
		if (!data.item?.date) return null
		return new Date(data.item.date).getFullYear()
	})
	const urlDomain = $derived.by(() => {
		if (!data.item?.url) return null
		try {
			return new URL(data.item.url).hostname.replace('www.', '')
		} catch {
			return null
		}
	})
	const subtitle = $derived.by(() => {
		const parts: string[] = []
		if (data.item?.creator) parts.push(data.item.creator)
		if (year) parts.push(String(year))
		return parts.join(' \u00B7 ') || null
	})
	const dateLabel = $derived.by(() => {
		if (dateStr) return formatDate(dateStr)
		if (data.item?.isCurrent) return 'In progress'
		return 'No completion date'
	})

	let summaryExpanded = $state(false)
	let summaryOverflows = $state(false)
	let summaryEl: HTMLParagraphElement | undefined = $state()

	$effect(() => {
		if (summaryEl && !summaryExpanded) {
			summaryOverflows = summaryEl.scrollHeight > summaryEl.clientHeight
		}
	})
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
			<article class="item-detail">
				<div class="item-meta-header">
					<a href={pageUrl} class="item-date-link" class:undated={!dateStr && !data.item.isCurrent}>
						{#if dateStr}
							<CheckboxIcon class="date-icon" />
							<time datetime={dateStr}>{dateLabel}</time>
						{:else if data.item.isCurrent}
							<PlayIcon class="date-icon" />
							{dateLabel}
						{:else}
							{dateLabel}
						{/if}
					</a>
					{#if data.item.status !== 'published'}
						<span class="draft-label">Draft&nbsp;&middot;&nbsp;Only visible to you</span>
					{/if}
					{#if data.item.url && urlDomain}
						<a href={data.item.url} target="_blank" rel="noopener noreferrer" class="visit-button">
							{urlDomain}
						</a>
					{/if}
				</div>

				<div class="item-body" class:no-image={!data.item.imageUrl}>
					{#if data.item.imageUrl}
						<div class="item-cover">
							<img src={data.item.imageUrl} alt={data.item.title} />
						</div>
					{/if}

					<div class="item-info">
						<h1>{data.item.title}</h1>

						{#if subtitle}
							<p class="item-subtitle">{subtitle}</p>
						{/if}

						{#if data.item.summary}
							<p class="item-summary" class:collapsed={!summaryExpanded} bind:this={summaryEl}>
								{data.item.summary}
							</p>
							{#if summaryOverflows || summaryExpanded}
								<button class="summary-toggle" onclick={() => (summaryExpanded = !summaryExpanded)}>
									{summaryExpanded ? 'Show less' : 'Read more'}
								</button>
							{/if}
						{/if}
					</div>
				</div>

				{#if renderedNote || data.item.rating}
					<div class="item-thoughts">
						<h2 class="thoughts-label">Thoughts</h2>
						{#if renderedNote}
							<div class="item-note">
								{@html renderedNote}
							</div>
						{/if}
						{#if data.item.rating}
							<div class="star-rating">
								{#each { length: data.item.rating } as _}
									<StarIcon />
								{/each}
							</div>
						{/if}
						{#if data.item.isFavorite}
							<p class="banger-label">A certified banger</p>
						{/if}
					</div>
				{/if}

				<footer class="item-footer">
					<BackButton href="/garden/{data.item.category}" label="Back to {data.categoryLabel}" />
					<HeartButton path="garden/{data.item.category}/{data.item.slug}" />
				</footer>
			</article>
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

	.item-detail {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
	}

	.item-meta-header {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}

	.item-date-link {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: 0.9rem;
		color: $text-color-subdued;
		font-weight: $font-weight;
		text-decoration: none;
		transition: color $transition-fast ease;

		:global(.date-icon) {
			width: 18px;
			height: 18px;
			color: $gray-50;
			flex-shrink: 0;
			transition: color $transition-fast ease;
		}

		&.undated {
			color: $gray-50;
		}

		&:hover {
			color: $red-50;

			:global(.date-icon) {
				color: $red-50;
			}
		}
	}

	.draft-label {
		font-size: 0.9rem;
		color: $text-color-subdued;
		font-weight: $font-weight;
	}

	.visit-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: $unit-half $unit-2x;
		background-color: $gray-95;
		color: $gray-20;
		font-size: 0.8125rem;
		font-weight: $font-weight-med;
		border-radius: $corner-radius-full;
		text-decoration: none;
		margin-left: auto;
		transition:
			background-color $transition-fast ease,
			color $transition-fast ease;

		&:hover {
			background-color: $gray-90;
			color: $gray-00;
		}
	}

	.item-body {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: $unit-4x;

		&.no-image {
			grid-template-columns: 1fr;
		}

		@include breakpoint('phone') {
			grid-template-columns: 1fr 1fr;
			gap: $unit-3x;
		}
	}

	.item-cover {
		border-radius: $unit;
		overflow: hidden;
		background-color: $gray-90;

		img {
			width: 100%;
			height: auto;
			display: block;
		}
	}

	.item-info {
		display: flex;
		flex-direction: column;

		h1 {
			font-size: 1.5rem;
			font-weight: $font-weight-bold;
			margin: 0 0 $unit;
			color: $gray-00;
		}
	}

	.item-subtitle {
		font-size: $font-size;
		color: $gray-30;
		margin: 0 0 $unit;
	}

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

	.item-summary {
		font-size: $font-size-small;
		line-height: 1.5;
		color: $gray-30;
		margin: 0;
		white-space: pre-line;

		&.collapsed {
			display: -webkit-box;
			-webkit-line-clamp: 3;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
	}

	.summary-toggle {
		background: none;
		border: none;
		padding: 0;
		font-size: $font-size-small;
		color: $gray-50;
		cursor: pointer;
		margin-top: $unit-half;
		margin-bottom: $unit-2x;
		align-self: flex-start;
		transition: color $transition-fast ease;

		&:hover {
			color: $red-50;
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

	.item-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.error {
		text-align: center;
		color: $gray-40;
		padding: $unit-6x;
	}
</style>
