<script lang="ts">
	import { dev } from '$app/environment'
	import { musicStream } from '$lib/stores/music-stream'
	import type { Album } from '$lib/types/lastfm'
	import { toast } from 'svelte-sonner'

	// Import SVG icons
	import CheckIcon from '$icons/check.svg?component'
	import XIcon from '$icons/x.svg?component'
	import LoaderIcon from '$icons/loader.svg?component'
	import ChevronDownIcon from '$icons/chevron-down.svg?component'
	import AppleMusicSearchModal from './AppleMusicSearchModal.svelte'

	// Only show in development
	if (!dev) {
		// Return empty component in production
	}

	let isMinimized = $state(true)
	let activeTab = $state<'nowplaying' | 'albums' | 'cache'>('nowplaying')

	// Music stream state
	let albums = $state<Album[]>([])
	let nowPlaying = $state<{ album: Album; track?: string } | null>(null)
	let connected = $state(false)
	let lastUpdate = $state<Date | null>(null)
	let updateFlash = $state(false)

	// Expanded album view
	let expandedAlbumId = $state<string | null>(null)

	// Update timing
	let nextUpdateIn = $state<number>(0)
	let updateInterval = $state<number>(30) // seconds
	let trackRemainingTime = $state<number>(0) // seconds

	// Cache management
	let cacheKey = $state('')
	let isClearing = $state(false)
	let clearingAlbums = $state(new Set<string>())

	// Search modal reference
	let searchModal: AppleMusicSearchModal | undefined = $state.raw()

	// Subscribe to music stream
	$effect(() => {
		const unsubscribe = musicStream.subscribe((state) => {
			albums = state.albums
			connected = state.connected

			// Flash indicator when update is received
			if (
				state.lastUpdate &&
				(!lastUpdate || state.lastUpdate.getTime() !== lastUpdate.getTime())
			) {
				updateFlash = true
				setTimeout(() => (updateFlash = false), 500)
			}

			lastUpdate = state.lastUpdate

			// Calculate smart interval based on track remaining time
			const nowPlayingAlbum = state.albums.find((a) => a.isNowPlaying)
			if (
				nowPlayingAlbum?.nowPlayingTrack &&
				nowPlayingAlbum.appleMusicData?.tracks &&
				nowPlayingAlbum.lastScrobbleTime
			) {
				const track = nowPlayingAlbum.appleMusicData.tracks.find(
					(t) => t.name === nowPlayingAlbum.nowPlayingTrack
				)

				if (track?.durationMs) {
					const elapsed = Date.now() - new Date(nowPlayingAlbum.lastScrobbleTime).getTime()
					const remaining = Math.max(0, track.durationMs - elapsed)
					trackRemainingTime = Math.round(remaining / 1000)

					// Smart interval based on remaining time
					if (remaining < 20000) {
						updateInterval = 5
					} else if (remaining < 60000) {
						updateInterval = 10
					} else {
						updateInterval = 15
					}
				} else {
					// No duration info, use default fast interval
					trackRemainingTime = 0
					updateInterval = 10
				}
			} else {
				// Not playing
				trackRemainingTime = 0
				updateInterval = 30
			}
		})
		return unsubscribe
	})

	$effect(() => {
		const unsubscribe = musicStream.nowPlaying.subscribe((np) => {
			nowPlaying = np
		})
		return unsubscribe
	})

	// Calculate next update countdown
	$effect(() => {
		if (!lastUpdate) {
			nextUpdateIn = updateInterval
			return
		}

		// Calculate initial remaining time
		const calculateRemaining = () => {
			const elapsed = Date.now() - lastUpdate!.getTime()
			const remaining = updateInterval * 1000 - elapsed
			return Math.max(0, Math.ceil(remaining / 1000))
		}

		// Set initial value
		nextUpdateIn = calculateRemaining()

		// Update every second
		const timer = setInterval(() => {
			nextUpdateIn = calculateRemaining()
		}, 1000)

		return () => clearInterval(timer)
	})

	async function clearCache() {
		if (!cacheKey.trim()) {
			toast.error('Please enter a cache key')
			return
		}

		isClearing = true
		try {
			const response = await fetch('/api/admin/debug/clear-cache', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: cacheKey })
			})

			if (response.ok) {
				const result = await response.json()
				toast.success(`Cleared cache: ${result.deleted} keys deleted`)
				cacheKey = ''
			} else {
				toast.error('Failed to clear cache')
			}
		} catch (error) {
			toast.error('Error clearing cache')
			console.error(error)
		} finally {
			isClearing = false
		}
	}

	async function clearAllMusicCache() {
		isClearing = true
		try {
			const response = await fetch('/api/admin/debug/clear-cache', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pattern: 'apple:album:*' })
			})

			if (response.ok) {
				const result = await response.json()
				toast.success(`Cleared all music cache: ${result.deleted} keys deleted`)
			} else {
				toast.error('Failed to clear music cache')
			}
		} catch (error) {
			toast.error('Error clearing music cache')
			console.error(error)
		} finally {
			isClearing = false
		}
	}

	async function clearAlbumCache(album: Album) {
		const albumKey = `apple:album:${album.artist.name}:${album.name}`
		const albumId = `${album.artist.name}:${album.name}`

		clearingAlbums.add(albumId)
		try {
			const response = await fetch('/api/admin/debug/clear-cache', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: albumKey })
			})

			if (response.ok) {
				await response.json()
				toast.success(`Cleared cache for "${album.name}"`)
			} else {
				toast.error(`Failed to clear cache for "${album.name}"`)
			}
		} catch (error) {
			toast.error('Error clearing album cache')
			console.error(error)
		} finally {
			clearingAlbums.delete(albumId)
			clearingAlbums = clearingAlbums // Trigger reactivity
		}
	}

	function formatTime(seconds: number): string {
		if (seconds < 60) return `${seconds}s`
		const minutes = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${minutes}m ${secs}s`
	}
</script>

{#if dev}
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
						<div class="section">
							<h4>Connection</h4>
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
						</div>

						{#if nowPlaying}
							<div class="section">
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
							</div>
						{/if}
					{/if}

					{#if activeTab === 'albums'}
						<div class="section">
							<h4>Recent Albums ({albums.length})</h4>
							<div class="albums-list">
								{#each albums as album}
									{@const albumId = `${album.artist.name}:${album.name}`}
									<div
										class="album-item"
										class:playing={album.isNowPlaying}
										class:expanded={expandedAlbumId === albumId}
									>
										<div
											class="album-header"
											role="button"
											tabindex="0"
											onclick={() =>
												(expandedAlbumId = expandedAlbumId === albumId ? null : albumId)}
											onkeydown={(e) =>
												e.key === 'Enter' &&
												(expandedAlbumId = expandedAlbumId === albumId ? null : albumId)}
										>
											<div class="album-content">
												<div class="album-title-row">
													<span class="name">{album.name}</span>
													{#if album.isNowPlaying}
														<span class="playing-badge">NOW</span>
													{/if}
												</div>
												<div class="album-meta">
													<span>{album.artist.name}</span>
													{#if album.appleMusicData}
														<span class="separator">·</span>
														<span>{album.appleMusicData.tracks?.length || 0} tracks</span>
														<span class="separator">·</span>
														<span>
															{#if album.appleMusicData.previewUrl}<CheckIcon
																	class="icon success inline"
																/>{:else}<XIcon class="icon error inline" />{/if} Preview
														</span>
													{/if}
												</div>
											</div>
											<button
												class="clear-cache-btn"
												onclick={(e) => {
													e.stopPropagation()
													clearAlbumCache(album)
												}}
												disabled={clearingAlbums.has(albumId)}
												title="Clear Apple Music cache for this album"
											>
												{#if clearingAlbums.has(albumId)}
													<LoaderIcon class="icon spinning" />
												{:else}
													<XIcon class="icon" />
												{/if}
											</button>
										</div>

										{#if expandedAlbumId === albumId}
											<div class="album-details">
												{#if album.appleMusicData}
													{#if album.appleMusicData.searchMetadata}
														<h5>Search Information</h5>
														<div class="search-metadata">
															<p>
																<strong>Search Query:</strong>
																<code>{album.appleMusicData.searchMetadata.searchQuery}</code>
															</p>
															<p>
																<strong>Search Time:</strong>
																{new Date(
																	album.appleMusicData.searchMetadata.searchTime
																).toLocaleString()}
															</p>
															<p>
																<strong>Status:</strong>
																{#if !album.appleMusicData.searchMetadata.error}
																	<CheckIcon class="icon success inline" /> Found
																{:else}
																	<XIcon class="icon error inline" /> Not Found
																{/if}
															</p>
															{#if album.appleMusicData.searchMetadata.error}
																<p>
																	<strong>Error:</strong>
																	<span class="error-text"
																		>{album.appleMusicData.searchMetadata.error}</span
																	>
																</p>
															{/if}
														</div>
													{/if}

													{#if album.appleMusicData.appleMusicId}
														<h5>Apple Music Details</h5>
														<p>
															<strong>Apple Music ID:</strong>
															{album.appleMusicData.appleMusicId}
														</p>
													{/if}

													{#if album.appleMusicData.releaseDate}
														<p><strong>Release Date:</strong> {album.appleMusicData.releaseDate}</p>
													{/if}

													{#if album.appleMusicData.recordLabel}
														<p><strong>Label:</strong> {album.appleMusicData.recordLabel}</p>
													{/if}

													{#if album.appleMusicData.genres?.length}
														<p><strong>Genres:</strong> {album.appleMusicData.genres.join(', ')}</p>
													{/if}

													{#if album.appleMusicData.previewUrl}
														<p>
															<strong>Preview URL:</strong>
															<code>{album.appleMusicData.previewUrl}</code>
														</p>
													{/if}

													{#if album.appleMusicData.tracks?.length}
														<div class="tracks-section">
															<h6>Tracks ({album.appleMusicData.tracks.length})</h6>
															<div class="tracks-list">
																{#each album.appleMusicData.tracks as track, i}
																	<div class="track-item">
																		<span class="track-number">{i + 1}.</span>
																		<span class="track-name">{track.name}</span>
																		{#if track.durationMs}
																			<span class="track-duration"
																				>{Math.floor(track.durationMs / 60000)}:{String(
																					Math.floor((track.durationMs % 60000) / 1000)
																				).padStart(2, '0')}</span
																			>
																		{/if}
																		{#if track.previewUrl}
																			<CheckIcon class="icon success inline" title="Has preview" />
																		{/if}
																	</div>
																{/each}
															</div>
														</div>
													{/if}

													<div class="raw-data">
														<h6>Raw Data</h6>
														<pre>{JSON.stringify(album.appleMusicData, null, 2)}</pre>
													</div>
												{:else}
													<h5>No Apple Music Data</h5>
													<p class="no-data">
														This album was not searched in Apple Music or the search is pending.
													</p>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if activeTab === 'cache'}
						<div class="section">
							<h4>Redis Cache Management</h4>

							<div class="cache-controls">
								<input
									type="text"
									bind:value={cacheKey}
									placeholder="Cache key (e.g., apple:album:Artist:Album)"
									disabled={isClearing}
								/>
								<button
									onclick={clearCache}
									disabled={isClearing || !cacheKey.trim()}
									class="clear-btn"
								>
									{isClearing ? 'Clearing...' : 'Clear Key'}
								</button>
							</div>

							<div class="cache-actions">
								<button onclick={() => searchModal?.open()} class="search-btn">
									Test Apple Music Search
								</button>

								<div class="cache-divider"></div>

								<button onclick={clearAllMusicCache} disabled={isClearing} class="clear-all-btn">
									{isClearing ? 'Clearing...' : 'Clear All Music Cache'}
								</button>

								<button
									onclick={async () => {
										isClearing = true
										try {
											const response = await fetch('/api/admin/debug/clear-cache', {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ pattern: 'notfound:apple-music:*' })
											})

											if (response.ok) {
												const result = await response.json()
												toast.success(`Cleared "not found" cache: ${result.deleted} keys deleted`)
											} else {
												toast.error('Failed to clear not found cache')
											}
										} catch (error) {
											toast.error('Error clearing not found cache')
											console.error(error)
										} finally {
											isClearing = false
										}
									}}
									disabled={isClearing}
									class="clear-not-found-btn"
								>
									{isClearing ? 'Clearing...' : 'Clear Not Found Cache'}
								</button>
							</div>

							<div class="cache-help">
								<p>Key format: <code>apple:album:ArtistName:AlbumName</code></p>
								<p>Example: <code>apple:album:藤井風:Hachikō</code></p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<AppleMusicSearchModal bind:this={searchModal} />
{/if}

<style lang="scss">
	.debug-panel {
		position: fixed;
		bottom: $unit * 2;
		right: $unit * 2;
		background: rgba(0, 0, 0, 0.95);
		color: white;
		border-radius: $unit;
		width: 420px;
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

	// --- Sections ---

	.section {
		margin-bottom: $unit * 1.5;

		&:last-child {
			margin-bottom: 0;
		}

		h4 {
			margin: 0 0 $unit 0;
			color: $info-color;
			font-size: $font-size-small;
			font-weight: $font-weight-bold;
		}

		p {
			margin: $unit-half 0;
			line-height: 1.4;
		}

		.flash {
			animation: flash 0.5s ease-out;
		}
	}

	// --- Now Playing: Connection Grid ---

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

	// --- Now Playing: Track Info ---

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

	// --- Albums: List ---

	.albums-list {
		display: flex;
		flex-direction: column;
	}

	.album-item {
		position: relative;
		transition: all $transition-normal;

		&:not(:last-child) {
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		}

		&.playing {
			background: rgba($success-color, 0.1);
		}

		&.expanded {
			background: rgba(255, 255, 255, 0.05);
		}

		.album-header {
			padding: $unit-half $unit-half;
			display: flex;
			align-items: center;
			gap: $unit;
			cursor: pointer;

			&:hover {
				background: rgba(255, 255, 255, 0.03);
			}
		}

		.album-content {
			flex: 1;
			min-width: 0;
		}

		.album-title-row {
			display: flex;
			align-items: center;
			gap: $unit;

			.name {
				font-weight: $font-weight-bold;
				color: rgba(255, 255, 255, 0.9);
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}

		.playing-badge {
			background: $success-color;
			color: white;
			padding: 1px 5px;
			border-radius: $corner-radius-xs;
			font-size: 10px;
			font-weight: $font-weight-bold;
			flex-shrink: 0;
		}

		.album-meta {
			display: flex;
			align-items: center;
			gap: 4px;
			margin-top: 1px;
			color: rgba(255, 255, 255, 0.5);
			font-size: $font-size-extra-small;

			.separator {
				color: rgba(255, 255, 255, 0.3);
			}
		}

		.clear-cache-btn {
			flex-shrink: 0;
			width: 24px;
			height: 24px;
			padding: 0;
			background: none;
			border: none;
			border-radius: 50%;
			color: rgba(255, 255, 255, 0.4);
			cursor: pointer;
			transition: all $transition-normal;
			display: flex;
			align-items: center;
			justify-content: center;

			&:hover:not(:disabled) {
				background: rgba(255, 255, 255, 0.1);
				color: $error-color;
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.album-details {
			padding: $unit * 1.5;
			border-top: 1px solid rgba(255, 255, 255, 0.1);

			h5 {
				margin: 0 0 $unit 0;
				color: $info-color;
				font-size: $font-size-small;
				font-weight: $font-weight-bold;
			}

			h6 {
				margin: $unit * 1.5 0 $unit 0;
				color: $warning-color;
				font-size: $font-size-extra-small;
				font-weight: $font-weight-bold;
			}

			p {
				margin: $unit-half 0;
				font-size: $font-size-extra-small;
				line-height: 1.5;

				strong {
					color: rgba(255, 255, 255, 0.8);
					margin-right: $unit-half;
				}
			}

			code {
				background: rgba(255, 255, 255, 0.1);
				padding: 2px 4px;
				border-radius: $corner-radius-xs;
				font-size: $font-size-extra-small;
				word-break: break-all;
			}

			.tracks-section {
				margin-top: $unit * 2;
			}

			.tracks-list {
				background: $overlay-dark;
				border-radius: $corner-radius-xs;
				padding: $unit;
				max-height: 200px;
				overflow-y: auto;
			}

			.track-item {
				display: flex;
				align-items: center;
				gap: $unit;
				padding: $unit-half 0;
				font-size: $font-size-extra-small;

				&:not(:last-child) {
					border-bottom: 1px solid rgba(255, 255, 255, 0.05);
				}

				.track-number {
					color: rgba(255, 255, 255, 0.5);
					min-width: 20px;
				}

				.track-name {
					flex: 1;
					color: rgba(255, 255, 255, 0.9);
				}

				.track-duration {
					color: rgba(255, 255, 255, 0.6);
					font-size: $font-size-extra-small;
				}
			}

			.raw-data {
				margin-top: $unit * 2;

				pre {
					background: rgba(0, 0, 0, 0.5);
					border: 1px solid rgba(255, 255, 255, 0.1);
					border-radius: $corner-radius-xs;
					padding: $unit;
					font-size: $font-size-extra-small;
					overflow-x: auto;
					max-height: 300px;
					overflow-y: auto;
					margin: 0;
				}
			}

			.search-metadata {
				background: rgba(255, 255, 255, 0.05);
				border-radius: $corner-radius-xs;
				padding: $unit;
				margin-bottom: $unit * 2;

				.error-text {
					color: $error-color;
				}
			}

			.no-data {
				color: rgba(255, 255, 255, 0.6);
				font-style: italic;
			}
		}
	}

	// --- Cache Tab ---

	.cache-controls {
		display: flex;
		gap: $unit;
		margin-bottom: $unit * 1.5;

		input {
			flex: 1;
			background: rgba(255, 255, 255, 0.1);
			border: 1px solid rgba(255, 255, 255, 0.2);
			color: white;
			padding: $unit;
			border-radius: $corner-radius-xs;
			font-size: $font-size-extra-small;
			font-family: inherit;

			&::placeholder {
				color: rgba(255, 255, 255, 0.4);
			}

			&:focus {
				outline: none;
				border-color: $primary-color;
				background: rgba(255, 255, 255, 0.15);
			}

			&:disabled {
				opacity: 0.5;
			}
		}

		.clear-btn {
			padding: $unit $unit * 2;
			background: $primary-color;
			border: none;
			color: white;
			border-radius: $corner-radius-xs;
			font-size: $font-size-extra-small;
			font-weight: $font-weight-med;
			cursor: pointer;
			transition: all $transition-normal;

			&:hover:not(:disabled) {
				background: darken($primary-color, 10%);
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}
	}

	.cache-actions {
		margin-bottom: $unit * 1.5;
		display: flex;
		flex-direction: column;
		gap: $unit;

		.clear-all-btn,
		.clear-not-found-btn,
		.search-btn {
			width: 100%;
			padding: $unit * 1.5;
			background: rgba(255, 255, 255, 0.08);
			border: 1px solid rgba(255, 255, 255, 0.15);
			border-radius: $corner-radius-xs;
			font-size: $font-size-extra-small;
			font-weight: $font-weight-med;
			cursor: pointer;
			transition: all $transition-normal;

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.search-btn {
			color: $info-color;

			&:hover {
				background: rgba($info-color, 0.15);
				border-color: rgba($info-color, 0.5);
			}
		}

		.cache-divider {
			height: 1px;
			background: rgba(255, 255, 255, 0.1);
			margin: $unit-half 0;
		}

		.clear-all-btn {
			color: $error-color;

			&:hover:not(:disabled) {
				background: rgba($error-color, 0.15);
				border-color: rgba($error-color, 0.5);
			}
		}

		.clear-not-found-btn {
			color: $warning-color;

			&:hover:not(:disabled) {
				background: rgba($warning-color, 0.15);
				border-color: rgba($warning-color, 0.5);
			}
		}
	}

	.cache-help {
		background: rgba(255, 255, 255, 0.05);
		padding: $unit;
		border-radius: $corner-radius-xs;

		p {
			margin: $unit-half 0;
			font-size: $font-size-extra-small;
			color: rgba(255, 255, 255, 0.7);

			code {
				background: rgba(255, 255, 255, 0.1);
				padding: 2px 4px;
				border-radius: $corner-radius-xs;
				font-size: $font-size-extra-small;
			}
		}
	}

	// --- Animations ---

	@keyframes flash {
		0% {
			background: rgba($success-color, 0.5);
		}
		100% {
			background: transparent;
		}
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	// --- Global icon styles ---

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
