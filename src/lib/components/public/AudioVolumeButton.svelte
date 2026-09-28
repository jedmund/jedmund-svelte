<script lang="ts">
	let { muted, volume, ontoggle }: { muted: boolean; volume: number; ontoggle: () => void } =
		$props()
	// Volume icon arc count: 0 when muted, 1-3 based on volume
	const volumeArcs = $derived.by(() => {
		if (muted || volume === 0) return 0
		if (volume < 0.33) return 1
		if (volume < 0.66) return 2
		return 3
	})
</script>

<!-- Volume button -->
<button
	type="button"
	class="volume-button"
	onclick={ontoggle}
	aria-label={muted ? 'Unmute' : 'Mute'}
>
	<svg width="20" height="18" viewBox="0 0 20 18" fill="none">
		<!-- Speaker body -->
		<path
			d="M2 6.5H5L9 2.5V15.5L5 11.5H2C1.4 11.5 1 11.1 1 10.5V7.5C1 6.9 1.4 6.5 2 6.5Z"
			fill="var(--volume-color)"
		/>

		{#if muted || volume === 0}
			<!-- X mark for muted -->
			<line
				x1="13"
				y1="6"
				x2="18"
				y2="12"
				stroke="var(--volume-color)"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
			<line
				x1="18"
				y1="6"
				x2="13"
				y2="12"
				stroke="var(--volume-color)"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
		{:else}
			<!-- Volume arcs -->
			{#if volumeArcs >= 1}
				<path
					d="M12 7.5C12.8 8.3 12.8 9.7 12 10.5"
					stroke="var(--volume-color)"
					stroke-width="1.5"
					stroke-linecap="round"
					fill="none"
				/>
			{/if}
			{#if volumeArcs >= 2}
				<path
					d="M14 5.5C15.7 7.2 15.7 10.8 14 12.5"
					stroke="var(--volume-color)"
					stroke-width="1.5"
					stroke-linecap="round"
					fill="none"
				/>
			{/if}
			{#if volumeArcs >= 3}
				<path
					d="M16 3.5C18.5 6 18.5 12 16 14.5"
					stroke="var(--volume-color)"
					stroke-width="1.5"
					stroke-linecap="round"
					fill="none"
				/>
			{/if}
		{/if}
	</svg>
</button>

<style lang="scss">
	.volume-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		border-radius: 50%;
		transition: background $transition-fast ease;
		margin-left: $unit-half;

		&:hover {
			background: rgba(0, 0, 0, 0.05);
		}
	}
</style>
