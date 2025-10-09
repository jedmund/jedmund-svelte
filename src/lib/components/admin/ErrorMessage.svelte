<script lang="ts">
	interface Props {
		message: string
		dismissible?: boolean
		onDismiss?: () => void
	}

	let { message, dismissible = false, onDismiss }: Props = $props()
</script>

<div class="error-message">
	<span class="error-text">{message}</span>
	{#if dismissible && onDismiss}
		<button type="button" class="dismiss-btn" onclick={onDismiss} aria-label="Dismiss">×</button>
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.error-message {
		background: $error-bg;
		color: $error-text;
		padding: $unit-3x;
		border-radius: $unit-2x;
		border: $unit-1px solid $error-border;
		text-align: center;
		margin-bottom: $unit-4x;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $unit-2x;

		.error-text {
			flex: 1;
		}

		.dismiss-btn {
			background: none;
			border: none;
			color: $error-text;
			font-size: calc($unit * 3); // 24px
			cursor: pointer;
			padding: 0;
			line-height: 1;
			opacity: 0.6;
			transition: opacity $transition-fast ease;

			&:hover {
				opacity: 1;
			}
		}
	}
</style>
