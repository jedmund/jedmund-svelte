<script lang="ts">
	import type { Snippet } from 'svelte'
	import UniverseIcon from '$icons/universe.svg?component'
	import PhotosIcon from '$icons/photos.svg?component'
	import { formatDate } from '$lib/utils/date'
	import { goto } from '$app/navigation'

	interface UniverseItem {
		slug: string
		publishedAt: string
		[key: string]: unknown
	}

	let {
		item,
		type = 'post',
		children
	}: {
		item: UniverseItem
		type?: 'post' | 'album'
		children?: Snippet
	} = $props()

	const href = $derived(type === 'album' ? `/photos/${item.slug}` : `/universe/${item.slug}`)

	const handleCardClick = (event: MouseEvent) => {
		// Check if the click is on an interactive element
		const target = event.target as HTMLElement
		const isInteractive =
			target.closest('a') ||
			target.closest('button') ||
			target.closest('.slideshow') ||
			target.closest('.album-slideshow') ||
			target.tagName === 'A' ||
			target.tagName === 'BUTTON'

		if (!isInteractive) {
			goto(href)
		}
	}
</script>

<article class="universe-card universe-card--{type}">
	<div
		class="card-content"
		onclick={handleCardClick}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && handleCardClick(e as unknown as MouseEvent)}
	>
		{@render children?.()}

		<div class="card-footer">
			<a {href} class="card-link" tabindex="-1">
				<time class="card-date" datetime={item.publishedAt}>
					{formatDate(item.publishedAt)}
				</time>
			</a>
			{#if type === 'album'}
				<PhotosIcon class="card-icon" />
			{:else}
				<UniverseIcon class="card-icon" />
			{/if}
		</div>
	</div>
</article>

<style lang="scss">
	@import '../../assets/styles/animations';

	.universe-card {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
	}

	.card-content {
		padding: $unit-3x;
		background: $gray-100;
		border-radius: $card-corner-radius;
		border: $unit-1px solid $gray-95;
		transition: all $transition-normal ease;
		cursor: pointer;
		outline: none;

		&:hover {
			border-color: $gray-85;
			box-shadow: 0 $unit-2px $unit rgba(0, 0, 0, 0.08);
		}

		&:focus-visible {
			outline: $unit-2px solid $red-60;
			outline-offset: $unit-2px;
		}
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: $unit-2x;
		padding-top: $unit-2x;
	}

	.card-link {
		text-decoration: none;
		color: inherit;
	}

	.card-date {
		color: $gray-40;
		font-size: $font-size-small;
		font-weight: 400;
		transition: color $transition-normal ease;
	}

	:global(.card-icon) {
		width: $unit-2x;
		height: $unit-2x;
		fill: $gray-40;
		transition: all $transition-normal ease;
	}

	.universe-card--post {
		.card-content:hover {
			.card-date {
				color: $red-60;
			}

			:global(.card-icon) {
				fill: $red-60;
				transform: rotate(15deg);
			}

			:global(.card-title-link) {
				color: $red-60;
			}
		}

		:global(.card-title-link) {
			color: $gray-10;
			text-decoration: none;
			transition: all $transition-normal ease;
		}
	}

	.universe-card--album {
		.card-content:hover {
			.card-date {
				color: $red-60;
			}

			:global(.card-icon) {
				fill: $red-60;
			}

			/* svelte-ignore css_unknown_property */
			:global(.card-icon rect:nth-child(1)) {
				transition: all $transition-medium ease;
				height: $unit-6px;
				y: $unit-2px;
			}

			/* svelte-ignore css_unknown_property */
			:global(.card-icon rect:nth-child(2)) {
				transition: all $transition-medium ease;
				height: $unit-10px;
				y: $unit-2px;
			}

			/* svelte-ignore css_unknown_property */
			:global(.card-icon rect:nth-child(3)) {
				transition: all $transition-medium ease;
				height: $unit;
				y: $unit-10px;
			}

			/* svelte-ignore css_unknown_property */
			:global(.card-icon rect:nth-child(4)) {
				transition: all $transition-medium ease;
				height: $unit-half;
				y: $unit-14px;
			}

			:global(.card-title-link) {
				color: $red-60;
			}
		}

		// Base state for smooth transition back
		:global(.card-icon rect) {
			transition: all 0.3s ease;
		}

		:global(.card-title-link) {
			color: $gray-10;
			text-decoration: none;
			transition: all $transition-normal ease;
		}
	}
</style>
