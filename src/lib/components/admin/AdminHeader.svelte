<script lang="ts">
	interface Props {
		title: string
		actions?: any
	}

	let { title, actions }: Props = $props()
</script>

<header>
	<h1>{title}</h1>
	{#if actions}
		<div class="header-actions">
			{@render actions()}
		</div>
	{/if}
</header>

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;

		h1 {
			font-size: 1.75rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
		}
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}
</style>
