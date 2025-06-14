<script lang="ts">
	interface Props {
		trackName?: string
	}

	let { trackName }: Props = $props()
</script>

<div class="now-playing">
	<div class="equalizer" aria-label="Now playing">
		<span class="bar"></span>
		<span class="bar"></span>
		<span class="bar"></span>
	</div>
	{#if trackName}
		<span class="track-name">{trackName}</span>
	{/if}
</div>

<style lang="scss">
	.now-playing {
		position: absolute;
		top: $unit;
		left: $unit;
		display: flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit-half $unit;
		background: rgba(0, 0, 0, 0.9);
		color: white;
		border-radius: $unit * 2;
		font-size: $font-size-small;
		backdrop-filter: blur(10px);
		z-index: 10;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.equalizer {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 16px;
	}

	.bar {
		width: 3px;
		background: $accent-color;
		animation: dance 0.6s ease-in-out infinite;
		transform-origin: bottom;
	}

	.bar:nth-child(1) {
		height: 40%;
		animation-delay: 0s;
	}

	.bar:nth-child(2) {
		height: 60%;
		animation-delay: 0.2s;
	}

	.bar:nth-child(3) {
		height: 50%;
		animation-delay: 0.4s;
	}

	@keyframes dance {
		0%,
		100% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(1.8);
		}
	}

	.track-name {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: $font-weight-med;
	}

	@include breakpoint('phone') {
		.now-playing {
			font-size: $font-size-extra-small;
			padding: $unit-fourth $unit-half;
		}

		.track-name {
			display: none;
		}
	}
</style>
