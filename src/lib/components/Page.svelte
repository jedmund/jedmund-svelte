<script lang="ts">
</script>

<section class="page">
	<header>
		<slot name="header" />
	</header>

	<slot />
</section>

<style lang="scss">
	.page {
		background: var(--page-color);
		border-radius: 16px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
		margin: $unit-6x auto $unit-6x;
		padding: $unit-5x;
		width: 100%;
		max-width: 784px;

		@include breakpoint('phone') {
			margin-top: $unit-2x;
			margin-bottom: $unit-3x;
			padding: $unit-3x;
		}

		@include breakpoint('small-phone') {
			padding: $unit-2x;
		}

		header {
			display: flex;
			flex-direction: column;
			align-items: center;
		}
	}
</style>
