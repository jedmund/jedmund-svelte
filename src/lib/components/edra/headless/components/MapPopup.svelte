<script lang="ts">
	interface Props {
		title?: string
		description?: string
	}

	let { title, description }: Props = $props()
</script>

<div class="map-popup">
	{#if title}
		<h4>{title}</h4>
	{/if}
	{#if description}
		<p>{description}</p>
	{/if}
</div>

<style lang="scss">
	.map-popup {
		h4 {
			margin: 0 0 8px;
			font-size: 16px;
			font-weight: 600;
		}

		p {
			margin: 0;
			font-size: 14px;
			color: #4b5563;
		}
	}
</style>
