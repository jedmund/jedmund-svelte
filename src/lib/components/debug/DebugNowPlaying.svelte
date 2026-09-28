<script lang="ts">
	import CheckIcon from '$icons/check.svg?component'
	import XIcon from '$icons/x.svg?component'
	import DebugSection from './DebugSection.svelte'
	import { formatDiagnosticTime as formatTime, type DiagnosticState } from './diagnostic-stream'
	let {
		connected,
		lastUpdate,
		updateFlash,
		nextUpdateIn,
		updateInterval,
		trackRemainingTime,
		nowPlaying
	}: Omit<DiagnosticState, 'albums'> = $props()
</script>

<DebugSection title="Connection">
	<div class="connection-grid">
		<span class="grid-label">Status</span>
		<span class="grid-value">
			<span class="status-dot" class:connected></span>
			{connected ? 'Connected' : 'Disconnected'}
		</span>

		<span class="grid-label">Last</span>
		<span class="grid-value" class:flash={updateFlash}>
			{lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
		</span>

		<span class="grid-label">Next</span>
		<span class="grid-value">{formatTime(nextUpdateIn)}</span>

		<span class="grid-label">Interval</span>
		<span class="grid-value"
			>{updateInterval}s {trackRemainingTime > 0
				? '(smart mode)'
				: nowPlaying
					? '(fast mode)'
					: '(normal)'}</span
		>

		{#if trackRemainingTime > 0}
			<span class="grid-label">Remaining</span>
			<span class="grid-value">{formatTime(trackRemainingTime)}</span>
		{/if}
	</div>
</DebugSection>

{#if nowPlaying}
	<DebugSection>
		<div class="now-playing-info">
			<p class="track">{nowPlaying.track || 'Unknown track'}</p>
			<p class="artist-album">
				{nowPlaying.album.artist.name} — {nowPlaying.album.name}
				{#if nowPlaying.album.appleMusicData}
					· {#if nowPlaying.album.appleMusicData.previewUrl}<CheckIcon
							class="icon success inline"
						/>{:else}<XIcon class="icon error inline" />{/if} Preview
				{/if}
			</p>
		</div>
	</DebugSection>
{/if}

<style lang="scss">
	.connection-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px $unit * 1.5;
		align-items: center;

		.grid-label {
			color: rgba(255, 255, 255, 0.5);
		}

		.grid-value {
			color: rgba(255, 255, 255, 0.9);
			display: flex;
			align-items: center;
			gap: 6px;
		}
	}
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: $error-color;
		flex-shrink: 0;

		&.connected {
			background: $success-color;
		}
	}
	.now-playing-info {
		background: rgba(255, 255, 255, 0.05);
		padding: $unit;
		border-radius: $corner-radius-sm;

		.track {
			margin: 0;
			font-weight: $font-weight-bold;
			color: rgba(255, 255, 255, 0.9);
		}

		.artist-album {
			margin: 2px 0 0;
			color: rgba(255, 255, 255, 0.5);
			display: flex;
			align-items: center;
			gap: 4px;
		}
	}
</style>
