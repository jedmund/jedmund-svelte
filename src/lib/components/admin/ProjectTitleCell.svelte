<script lang="ts">
	interface Props {
		item: {
			title: string
			backgroundColor: string | null
		}
	}

	let { item }: Props = $props()
</script>

<div class="title-cell">
	{#if item.backgroundColor}
		<span class="color-dot" style="background-color: {item.backgroundColor}"></span>
	{/if}
	<span class="title">{item.title}</span>
</div>

<style lang="scss">
	.title-cell {
		display: flex;
		align-items: center;
		gap: $unit;
	}

	.color-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.title {
		color: $grey-10;
	}
</style>
