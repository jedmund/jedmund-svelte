<script lang="ts">
	import type { ComponentType } from 'svelte'

	let {
		icon,
		text,
		href,
		active = false,
		variant = 'default'
	}: {
		icon: ComponentType
		text: string
		href?: string
		active?: boolean
		variant?: 'work' | 'universe' | 'default'
	} = $props()
</script>

<a {href} class="pill {variant}" class:active>
	<svelte:component this={icon} />
	<span>{text}</span>
</a>

<style lang="scss">
	.pill {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 10px 12px;
		border-radius: 100px;
		text-decoration: none;
		color: $grey-20; // #666
		font-size: 1rem;
		font-weight: 400;
		transition: all 0.2s ease;

		:global(svg) {
			width: 20px;
			height: 20px;
			flex-shrink: 0;
			fill: currentColor;
		}

		// Work variant
		&.work {
			&:hover,
			&.active {
				background: $work-bg;
				color: $work-color;

				:global(svg) {
					fill: $work-color;
				}
			}
		}

		// Universe variant
		&.universe {
			&:hover,
			&.active {
				background: $universe-bg;
				color: $universe-color;

				:global(svg) {
					fill: $universe-color;
				}
			}
		}

		// Default variant (Labs)
		&.default {
			&:hover,
			&.active {
				background: $labs-bg;
				color: $labs-color;

				:global(svg) {
					fill: $labs-color;
				}
			}
		}
	}
</style>
