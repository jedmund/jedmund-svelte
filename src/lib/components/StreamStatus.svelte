<script lang="ts">
	import { musicStream } from '$lib/stores/music-stream'

	let isConnected = $state(false)

	$effect(() => {
		const unsubscribe = musicStream.subscribe((state) => {
			isConnected = state.connected
		})
		return unsubscribe
	})
</script>

{#if isConnected}
	<div class="stream-status connected" title="Live updates active">
		<span class="dot"></span>
	</div>
{/if}

<style lang="scss">
	.stream-status {
		position: fixed;
		bottom: $unit * 2;
		right: $unit * 2;
		display: flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit-half $unit;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		border-radius: $unit * 2;
		font-size: $font-size-small;
		z-index: $z-index-overlay;
		animation: fadeIn 0.3s ease-out;

		&.connected {
			.dot {
				background: #4caf50;
				animation: pulse 2s ease-in-out infinite;
			}
		}

		.dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(0.9);
		}
	}

	@include breakpoint('phone') {
		.stream-status {
			bottom: $unit;
			right: $unit;
		}
	}
</style>
