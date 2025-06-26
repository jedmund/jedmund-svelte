<script lang="ts">
	interface Props {
		size?: 'small' | 'medium' | 'large'
		text?: string
	}

	let { size = 'medium', text = '' }: Props = $props()

	const sizeMap = {
		small: '24px',
		medium: '32px',
		large: '48px'
	}
</script>

<div class="loading-spinner">
	<div class="spinner" style="width: {sizeMap[size]}; height: {sizeMap[size]};"></div>
	{#if text}
		<p class="loading-text">{text}</p>
	{/if}
</div>

<style lang="scss">
	.loading-spinner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: $unit-2x;
		padding: $unit-8x;
	}

	.spinner {
		border: 3px solid $gray-80;
		border-top-color: $primary-color;
		border-radius: 50%;
		animation: spin $animation-normal linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-text {
		margin: 0;
		color: $gray-40;
		font-size: 1rem;
	}
</style>
