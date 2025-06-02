<script lang="ts">
	import type { Snippet } from 'svelte'
	import UniverseIcon from '$icons/universe.svg'
	import { formatDate } from '$lib/utils/date'
	import { goto } from '$app/navigation'

	interface UniverseItem {
		slug: string
		publishedAt: string
		[key: string]: any
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
		onkeydown={(e) => e.key === 'Enter' && handleCardClick(e)}
	>
		{@render children?.()}

		<div class="card-footer">
			<a {href} class="card-link" tabindex="-1">
				<time class="card-date" datetime={item.publishedAt}>
					{formatDate(item.publishedAt)}
				</time>
			</a>
			<UniverseIcon class="universe-icon" />
		</div>
	</div>
</article>

<style lang="scss">
	.universe-card {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
	}

	.card-content {
		padding: $unit-4x;
		background: $grey-100;
		border-radius: $card-corner-radius;
		border: 1px solid $grey-95;
		transition: all 0.2s ease;
		cursor: pointer;
		outline: none;

		&:hover {
			border-color: $grey-85;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		}

		&:focus-visible {
			outline: 2px solid $red-60;
			outline-offset: 2px;
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
		color: $grey-40;
		font-size: 0.875rem;
		font-weight: 400;
		transition: color 0.2s ease;
	}

	:global(.universe-icon) {
		width: 16px;
		height: 16px;
		fill: $grey-40;
		transition: all 0.2s ease;
	}

	.universe-card--post {
		.card-content:hover {
			.card-date {
				color: $red-60;
			}

			:global(.universe-icon) {
				fill: $red-60;
				transform: rotate(15deg);
			}

			:global(.card-title-link) {
				color: $red-60;
			}
		}

		:global(.card-title-link) {
			color: $grey-10;
			text-decoration: none;
			transition: all 0.2s ease;
		}
	}

	.universe-card--album {
		.card-content:hover {
			.card-date {
				color: $red-60;
			}

			:global(.universe-icon) {
				fill: $red-60;
				transform: rotate(15deg);
			}

			:global(.card-title-link) {
				color: $red-60;
			}
		}

		:global(.card-title-link) {
			color: $grey-10;
			text-decoration: none;
			transition: all 0.2s ease;
		}
	}
</style>
