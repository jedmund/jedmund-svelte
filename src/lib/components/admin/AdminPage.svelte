<script lang="ts">
	export let noHorizontalPadding = false
</script>

<section class="admin-page" class:no-horizontal-padding={noHorizontalPadding}>
	<div class="page-header">
		<slot name="header" />
	</div>

	<div class="page-content">
		<slot />
	</div>

	{#if $$slots.fullwidth}
		<div class="page-fullwidth">
			<slot name="fullwidth" />
		</div>
	{/if}
</section>

<style lang="scss">
	@import '$styles/variables.scss';
	@import '$styles/mixins.scss';

	.admin-page {
		background: white;
		border-radius: $card-corner-radius;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		margin: 0 auto $unit-2x;
		width: calc(100% - #{$unit-6x});
		max-width: 900px; // Much wider for admin
		min-height: calc(100vh - #{$unit-16x}); // Full height minus margins
		overflow: hidden; // Ensure border-radius clips content

		&:first-child {
			margin-top: 0;
		}

		@include breakpoint('phone') {
			margin-bottom: $unit-3x;
			width: calc(100% - #{$unit-4x});
		}

		@include breakpoint('small-phone') {
			width: calc(100% - #{$unit-3x});
		}
	}

	.page-header {
		box-sizing: border-box;
		min-height: 110px;
		padding: $unit-4x;
		display: flex;

		@include breakpoint('phone') {
			padding: $unit-3x;
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
