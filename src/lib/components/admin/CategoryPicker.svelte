<script lang="ts">
	import { clickOutside } from '$lib/actions/clickOutside'
	import { GARDEN_CATEGORIES, type GardenCategory } from '$lib/constants/garden'
	import CategoryBookIcon from '$icons/category-book.svg?component'
	import CategoryGameIcon from '$icons/category-game.svg?component'
	import CategoryMangaIcon from '$icons/category-manga.svg?component'
	import CategoryMovieIcon from '$icons/category-movie.svg?component'
	import CategoryMusicIcon from '$icons/category-music.svg?component'
	import CategoryTVIcon from '$icons/category-tv.svg?component'
	import CategoryDeviceIcon from '$icons/category-device.svg?component'
	import CategoryOtherIcon from '$icons/category-other.svg?component'
	import ChevronDownIcon from '$icons/chevron-down.svg?component'

	interface Props {
		category: GardenCategory
		onCategoryChange: (category: GardenCategory) => void
	}

	let { category, onCategoryChange }: Props = $props()

	let isOpen = $state(false)

	const CATEGORY_ICONS: Record<GardenCategory, typeof CategoryBookIcon> = {
		book: CategoryBookIcon,
		game: CategoryGameIcon,
		manga: CategoryMangaIcon,
		movie: CategoryMovieIcon,
		music: CategoryMusicIcon,
		tv_show: CategoryTVIcon,
		device: CategoryDeviceIcon,
		other: CategoryOtherIcon
	}

	function handleSelect(value: GardenCategory) {
		onCategoryChange(value)
		isOpen = false
	}

	const CurrentIcon = $derived(CATEGORY_ICONS[category])
	const currentLabel = $derived(GARDEN_CATEGORIES.find((c) => c.value === category)?.singular ?? '')

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isOpen = false
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="category-picker"
	use:clickOutside={{ callback: () => (isOpen = false), enabled: isOpen }}
	onkeydown={handleKeydown}
>
	<button
		type="button"
		class="category-pill"
		class:open={isOpen}
		onclick={() => (isOpen = !isOpen)}
		aria-label="Change category"
		aria-expanded={isOpen}
		aria-haspopup="listbox"
	>
		<CurrentIcon />
		<span class="pill-label">{currentLabel}</span>
		<ChevronDownIcon />
	</button>

	{#if isOpen}
		<div class="category-dropdown" role="listbox">
			{#each GARDEN_CATEGORIES as cat}
				{@const CatIcon = CATEGORY_ICONS[cat.value]}
				<button
					type="button"
					class="category-option"
					class:selected={cat.value === category}
					onclick={() => handleSelect(cat.value)}
					role="option"
					aria-selected={cat.value === category}
				>
					<CatIcon />
					<span>{cat.singular}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.category-picker {
		position: relative;
		flex-shrink: 0;
		align-self: stretch;
	}

	.category-pill {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $unit-fourth;
		height: 100%;
		padding: 0 $unit;
		border: none;
		border-radius: $corner-radius-full;
		background: $red-50;
		color: $white;
		cursor: pointer;
		transition:
			background $transition-fast ease,
			color $transition-fast ease;

		&:hover,
		&.open {
			background: $red-40;

			.pill-label {
				max-width: 100px;
				opacity: 1;
				margin: 0 $unit-fourth;
			}
		}

		.pill-label {
			max-width: 0;
			opacity: 0;
			overflow: hidden;
			white-space: nowrap;
			font-size: $font-size;
			font-weight: $font-weight-med;
			transition:
				max-width $transition-normal ease,
				opacity $transition-normal ease,
				margin $transition-normal ease;
		}

		:global(svg) {
			width: 21px;
			height: 21px;
		}

		:global(svg:last-child) {
			width: 12px;
			height: 12px;
			opacity: 0.7;
		}
	}

	.category-dropdown {
		position: absolute;
		top: calc(100% + $unit);
		left: 0;
		z-index: 110;
		background: $white;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-xl;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		padding: $unit;
		min-width: 160px;
		display: flex;
		flex-direction: column;
		gap: $unit-fourth;
	}

	.category-option {
		display: flex;
		align-items: center;
		gap: $unit;
		width: 100%;
		padding: $unit $unit-2x;
		border: none;
		background: none;
		border-radius: $corner-radius-md;
		cursor: pointer;
		text-align: left;
		font-size: $font-size-med;
		color: $gray-20;
		transition: background $transition-fast ease;

		&:hover {
			background: $gray-95;
		}

		&.selected {
			background: $red-95;
			color: $red-40;
		}

		:global(svg) {
			width: 21px;
			height: 21px;
			flex-shrink: 0;
		}
	}
</style>
