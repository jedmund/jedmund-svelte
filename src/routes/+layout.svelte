<script lang="ts">
	import Avatar from '$components/Avatar.svelte'
	import Squiggly from '$components/Squiggly.svelte'
</script>

<svelte:head>
	<title>@jedmund</title>
	<meta
		name="description"
		content="Justin Edmund is a software designer based in San Francisco, California."
	/>
	<link href="/assets/styles/reset.css" rel="stylesheet" />
</svelte:head>

<main>
	<section class="page">
		<header>
			<h1 aria-label="@jedmund">
				<Avatar />
			</h1>
			<Squiggly text="@jedmund is a software designer" />
		</header>

		<slot />
	</section>
</main>

<style lang="scss">
	:global(html) {
		background: var(--bg-color);
		color: var(--text-color);
		font-family: 'cstd', 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}

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
