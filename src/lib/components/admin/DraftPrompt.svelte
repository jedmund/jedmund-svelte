<script lang="ts">
	interface Props {
		timeAgo: string | null
		onRestore: () => void
		onDismiss: () => void
	}

	let { timeAgo, onRestore, onDismiss }: Props = $props()
</script>

<div class="draft-banner">
	<div class="draft-banner-content">
		<span class="draft-banner-text">
			Unsaved draft found{#if timeAgo} (saved {timeAgo}){/if}.
		</span>
		<div class="draft-banner-actions">
			<button class="draft-banner-button" type="button" onclick={onRestore}>Restore</button>
			<button class="draft-banner-button dismiss" type="button" onclick={onDismiss}>
				Dismiss
			</button>
		</div>
	</div>
</div>

<style lang="scss">
	.draft-banner {
		background: $blue-95;
		border-bottom: 1px solid $blue-80;
		padding: $unit-2x $unit-5x;
		display: flex;
		justify-content: center;
		align-items: center;
		animation: slideDown 0.2s ease-out;

		@keyframes slideDown {
			from {
				opacity: 0;
				transform: translateY(-10px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
	}

	.draft-banner-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $unit-3x;
		width: 100%;
		max-width: 1200px;
	}

	.draft-banner-text {
		color: $blue-20;
		font-size: $font-size-small;
		font-weight: $font-weight-med;
	}

	.draft-banner-actions {
		display: flex;
		gap: $unit-2x;
	}

	.draft-banner-button {
		background: $blue-50;
		border: none;
		color: $white;
		cursor: pointer;
		padding: $unit-half $unit-2x;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		font-weight: $font-weight-med;
		transition: background $transition-fast;

		&:hover {
			background: $blue-40;
		}

		&.dismiss {
			background: transparent;
			color: $blue-30;

			&:hover {
				background: $blue-90;
			}
		}
	}
</style>
