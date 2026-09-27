<script lang="ts">
	import ChevronDownIcon from '$icons/chevron-down.svg?component'
	import AppleMusicSearchModal from '../AppleMusicSearchModal.svelte'
	import DebugNowPlaying from './DebugNowPlaying.svelte'
	import DebugAlbums from './DebugAlbums.svelte'
	import DebugCache from './DebugCache.svelte'
	import { useDebugDiagnostics } from './useDebugDiagnostics.svelte'
	import { useDebugCache } from './useDebugCache.svelte'
	const diagnostics = useDebugDiagnostics()
	const cache = useDebugCache()
	let isMinimized = $state(true)
	let activeTab = $state<'nowplaying' | 'albums' | 'cache'>('nowplaying')
	let expandedAlbumId = $state<string | null>(null)
	let cacheKey = $state('')
	let searchModal: AppleMusicSearchModal | undefined = $state.raw()
</script>

<div class="debug-panel" class:minimized={isMinimized}>
	<div
		class="debug-header"
		role="button"
		tabindex="0"
		onclick={() => (isMinimized = !isMinimized)}
		onkeydown={(e) => e.key === 'Enter' && (isMinimized = !isMinimized)}
	>
		<h3>Debug Panel</h3>
		<button
			class="minimize-btn"
			class:minimized={isMinimized}
			aria-label={isMinimized ? 'Expand' : 'Minimize'}
		>
			<ChevronDownIcon class="icon chevron" />
		</button>
	</div>

	{#if !isMinimized}
		<div class="debug-content">
			<div class="tabs">
				<button
					class="tab"
					class:active={activeTab === 'nowplaying'}
					onclick={() => (activeTab = 'nowplaying')}
				>
					Now Playing
				</button>
				<button
					class="tab"
					class:active={activeTab === 'albums'}
					onclick={() => (activeTab = 'albums')}
				>
					Albums
				</button>
				<button
					class="tab"
					class:active={activeTab === 'cache'}
					onclick={() => (activeTab = 'cache')}
				>
					Cache
				</button>
			</div>

			<div class="tab-content">
				{#if activeTab === 'nowplaying'}
					<DebugNowPlaying
						connected={diagnostics.state.connected}
						lastUpdate={diagnostics.state.lastUpdate}
						updateFlash={diagnostics.state.updateFlash}
						nextUpdateIn={diagnostics.state.nextUpdateIn}
						updateInterval={diagnostics.state.updateInterval}
						trackRemainingTime={diagnostics.state.trackRemainingTime}
						nowPlaying={diagnostics.state.nowPlaying}
					/>
				{:else if activeTab === 'albums'}
					<DebugAlbums
						albums={diagnostics.state.albums}
						bind:expandedAlbumId
						clearingAlbums={cache.clearingAlbums}
						onClear={cache.clearAlbumCache}
					/>
				{:else}
					<DebugCache
						bind:cacheKey
						isClearing={cache.isClearing}
						clear={cache.clear}
						onSearch={() => searchModal?.open()}
					/>
				{/if}
			</div>
		</div>
	{/if}
</div>

<AppleMusicSearchModal bind:this={searchModal} />

<style lang="scss">
	.debug-panel {
		position: fixed;
		bottom: $unit * 2;
		right: $unit * 2;
		background: rgba(0, 0, 0, 0.95);
		color: white;
		border-radius: $unit;
		width: 420px;
		max-width: calc(100vw - #{$unit * 4});
		max-height: 600px;
		z-index: 9999;
		font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
		font-size: $font-size-extra-small;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(10px);
		transition: all $transition-normal ease;

		&.minimized {
			width: auto;
			max-height: auto;
		}
	}
	.debug-header {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: $unit * 1.5;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		cursor: pointer;
		user-select: none;

		h3 {
			margin: 0;
			font-size: $font-size-small;
			font-weight: $font-weight-bold;
		}

		.minimize-btn {
			position: absolute;
			right: $unit * 1.5;
			background: none;
			border: none;
			color: white;
			font-size: $font-size-extra-small;
			cursor: pointer;
			padding: 4px 8px;
			border-radius: $corner-radius-xs;
			transition: background $transition-normal;
			display: flex;
			align-items: center;
			justify-content: center;

			:global(.chevron) {
				transition: transform $transition-normal;
			}

			&.minimized :global(.chevron) {
				transform: rotate(180deg);
			}

			&:hover {
				background: rgba(255, 255, 255, 0.1);
			}
		}
	}
	.debug-content {
		overflow-y: auto;
		max-height: 520px;
	}
	.tabs {
		display: flex;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);

		.tab {
			flex: 1;
			padding: $unit $unit * 2;
			background: none;
			border: none;
			color: rgba(255, 255, 255, 0.6);
			cursor: pointer;
			font-size: $font-size-extra-small;
			font-weight: $font-weight-med;
			transition: all $transition-normal;

			&:hover {
				color: rgba(255, 255, 255, 0.8);
				background: rgba(255, 255, 255, 0.05);
			}

			&.active {
				color: white;
				background: rgba(255, 255, 255, 0.1);
				border-bottom: 2px solid $primary-color;
			}
		}
	}
	.tab-content {
		padding: $unit * 1.5;
	}
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	.debug-panel :global(.icon) {
		width: 14px;
		height: 14px;
		display: inline-block;
		vertical-align: text-bottom;

		&:global(.success) {
			color: $success-color;
		}

		&:global(.error) {
			color: $error-color;
		}

		&:global(.inline) {
			width: 12px;
			height: 12px;
		}

		&:global(.spinning) {
			animation: spin 1s linear infinite;
		}
	}
</style>
