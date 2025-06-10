<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		noHorizontalPadding?: boolean
		class?: string
		header?: Snippet
		children?: Snippet
	}

	let { noHorizontalPadding = false, class: className = '', header, children }: Props = $props()
</script>

<section class="page {className}" class:no-horizontal-padding={noHorizontalPadding}>
	{#if header}
		<header>
			{@render header()}
		</header>
	{/if}

	{#if children}
		{@render children()}
	{/if}
</section>

<style lang="scss">
	.page {
		background: var(--page-color);
		border-radius: $card-corner-radius; // Match universe posts
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		margin: $unit-6x auto $unit-6x;
		padding: $unit-3x;
		width: 100%;
		max-width: 700px;

		&:first-child {
			margin-top: 0;
		}

		&.no-horizontal-padding {
			padding-left: 0;
			padding-right: 0;
		}

		@include breakpoint('phone') {
			margin-top: $unit-3x;
			margin-bottom: $unit-3x;
			padding: $unit-3x;

			&.no-horizontal-padding {
				padding-left: 0;
				padding-right: 0;
			}
		}

		@include breakpoint('small-phone') {
			gap: $unit-2x;
			padding: $unit-2x;

			&.no-horizontal-padding {
				padding-left: 0;
				padding-right: 0;
			}
		}

		header {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: $unit-2x;
		}
	}
</style>
