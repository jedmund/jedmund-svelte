<script lang="ts">
	interface Tag {
		name: string
		displayName: string
		slug: string
	}

	interface TagPillProps {
		tag: Tag
		size?: 'small' | 'medium' | 'large'
		clickable?: boolean
		href?: string
	}

	const { tag, size = 'medium', clickable = false, href }: TagPillProps = $props()
</script>

{#if href}
	<a class="tag-pill tag-pill-{size}" class:clickable {href}>
		{tag.displayName}
	</a>
{:else}
	<span class="tag-pill tag-pill-{size}" class:clickable>
		{tag.displayName}
	</span>
{/if}

<style lang="scss">
	@import '$styles/variables';

	.tag-pill {
		display: inline-flex;
		align-items: center;
		padding: 4px $unit;
		background: $gray-90;
		border-radius: $corner-radius-sm;
		font-size: 14px;
		color: $gray-20;
		text-decoration: none;
		white-space: nowrap;

		&.clickable {
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover {
				background: $gray-80;
				color: $gray-10;
			}
		}

		&.tag-pill-small {
			font-size: 12px;
			padding: 2px $unit-half;
		}

		&.tag-pill-large {
			font-size: 16px;
			padding: $unit-half $unit-2x;
		}
	}
</style>
