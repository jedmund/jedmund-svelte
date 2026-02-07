<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		noHorizontalPadding?: boolean
		header?: Snippet
		children?: Snippet
		fullwidth?: Snippet
	}

	const { noHorizontalPadding = false, header, children, fullwidth }: Props = $props()

	let scrollContainer: HTMLElement
	let isScrolled = $state(false)

	function handleScroll(e: Event) {
		const target = e.target as HTMLElement
		isScrolled = target.scrollTop > 0
	}
</script>

<section
	class="admin-page"
	class:no-horizontal-padding={noHorizontalPadding}
	bind:this={scrollContainer}
	onscroll={handleScroll}
>
	<div class="page-header" class:scrolled={isScrolled}>
		{#if header}{@render header()}{/if}
	</div>

	<div class="page-content">
		{#if children}{@render children()}{/if}
	</div>

	{#if fullwidth}
		<div class="page-fullwidth">
			{@render fullwidth()}
		</div>
	{/if}
</section>

<style lang="scss">
	@import '$styles/variables.scss';
	@import '$styles/mixins.scss';

	.admin-page {
		background: white;
		border-radius: $corner-radius-lg;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		margin: 0;
		width: 100%;
		height: 100vh;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.page-header {
		position: sticky;
		top: 0;
		z-index: $z-index-sticky;
		background: white;
		box-sizing: border-box;
		min-height: 90px;
		padding: $unit-3x $unit-4x;
		display: flex;
		transition: box-shadow 0.2s ease;

		&.scrolled {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		}

		@include breakpoint('phone') {
			padding: $unit-2x;
		}

		@include breakpoint('small-phone') {
			padding: $unit-2x;
		}

		:global(header) {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			width: 100%;
			gap: $unit-2x;
		}
	}

	.page-content {
		padding: 0 $unit-2x $unit-4x;

		@include breakpoint('phone') {
			padding: 0 $unit-3x $unit-3x;
		}

		@include breakpoint('small-phone') {
			padding: 0 $unit-2x $unit-2x;
		}
	}

	.page-fullwidth {
		padding: 0;
		margin-top: $unit-3x;

		@include breakpoint('small-phone') {
			margin-top: $unit-2x;
		}
	}
</style>
