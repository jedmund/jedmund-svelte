<script lang="ts">
	import StarIcon from '$icons/star.svg?component'
	import type { GardenItem } from '@prisma/client'

	interface Props {
		item: GardenItem
		showBadges?: boolean
	}

	let { item, showBadges = false }: Props = $props()
</script>

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
		{#if showBadges && (item.isCurrent || item.isFavorite)}
			<div class="badges">
				{#if item.isCurrent}
					<span class="badge current">Currently enjoying</span>
				{/if}
				{#if item.isFavorite}
					<span class="badge favorite">Banger</span>
				{/if}
			</div>
		{/if}
	</div>
</a>

<style lang="scss">
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
</style>
