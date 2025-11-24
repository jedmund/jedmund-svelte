<script lang="ts">
	import { dev } from '$app/environment'
	import { musicStream } from '$lib/stores/music-stream'
	import type { Album } from '$lib/types/lastfm'
	import { toast } from 'svelte-sonner'
	
	// Import SVG icons
	import CheckIcon from '$icons/check.svg'
	import XIcon from '$icons/x.svg'
	import TrashIcon from '$icons/trash.svg'
	import LoaderIcon from '$icons/loader.svg'
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
	let searchModal: AppleMusicSearchModal

	// Subscribe to music stream
	$effect(() => {
		const unsubscribe = musicStream.subscribe((state) => {
			albums = state.albums
			connected = state.connected
			
			// Flash indicator when update is received
			if (state.lastUpdate && (!lastUpdate || state.lastUpdate.getTime() !== lastUpdate.getTime())) {
				updateFlash = true
				setTimeout(() => updateFlash = false, 500)
			}
			
			lastUpdate = state.lastUpdate
			
			// Calculate smart interval based on track remaining time
			const nowPlayingAlbum = state.albums.find(a => a.isNowPlaying)
			if (nowPlayingAlbum?.nowPlayingTrack && nowPlayingAlbum.appleMusicData?.tracks && nowPlayingAlbum.lastScrobbleTime) {
				const track = nowPlayingAlbum.appleMusicData.tracks.find(
					t => t.name === nowPlayingAlbum.nowPlayingTrack
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
			const elapsed = Date.now() - lastUpdate.getTime()
			const remaining = (updateInterval * 1000) - elapsed
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
			<button class="minimize-btn" aria-label={isMinimized ? 'Expand' : 'Minimize'}>
				{isMinimized ? '▲' : '▼'}
			</button>
		</div>
		
		{#if !isMinimized}
			<div class="debug-content">
				<div class="tabs">
					<button 
						class="tab" 
						class:active={activeTab === 'nowplaying'}
						onclick={() => activeTab = 'nowplaying'}
					>
						Now Playing
					</button>
					<button 
						class="tab" 
						class:active={activeTab === 'albums'}
						onclick={() => activeTab = 'albums'}
					>
						Albums
					</button>
					<button 
						class="tab" 
						class:active={activeTab === 'cache'}
						onclick={() => activeTab = 'cache'}
					>
						Cache
					</button>
				</div>
				
				<div class="tab-content">
					{#if activeTab === 'nowplaying'}
						<div class="section">
							<h4>Connection</h4>
							<p class="status" class:connected>
								Status: {#if connected}<CheckIcon class="icon status-icon success" /> Connected{:else}<XIcon class="icon status-icon error" /> Disconnected{/if}
							</p>
							<p class:flash={updateFlash}>
								Last Update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
							</p>
							<p>Next Update: {formatTime(nextUpdateIn)}</p>
							<p>Interval: {updateInterval}s {trackRemainingTime > 0 ? `(smart mode)` : nowPlaying ? '(fast mode)' : '(normal)'}</p>
							{#if trackRemainingTime > 0}
								<p>Track Remaining: {formatTime(trackRemainingTime)}</p>
							{/if}
						</div>
						
						<div class="section">
							<h4>Now Playing</h4>
							{#if nowPlaying}
								<div class="now-playing-info">
									<p class="artist">{nowPlaying.album.artist.name}</p>
									<p class="album">{nowPlaying.album.name}</p>
									{#if nowPlaying.track}
										<p class="track">{nowPlaying.track}</p>
									{/if}
									{#if nowPlaying.album.appleMusicData}
										<p class="preview">
											<span>Preview:</span> {#if nowPlaying.album.appleMusicData.previewUrl}<CheckIcon class="icon success" /> Available{:else}<XIcon class="icon error" /> Not found{/if}
										</p>
									{/if}
								</div>
							{:else}
								<p class="no-music">No music playing</p>
							{/if}
						</div>
					{/if}
					
					{#if activeTab === 'albums'}
						<div class="section">
							<h4>Recent Albums ({albums.length})</h4>
							<div class="albums-list">
								{#each albums as album}
									{@const albumId = `${album.artist.name}:${album.name}`}
									<div class="album-item" class:playing={album.isNowPlaying} class:expanded={expandedAlbumId === albumId}>
										<div
										class="album-header"
										role="button"
										tabindex="0"
										onclick={() => (expandedAlbumId = expandedAlbumId === albumId ? null : albumId)}
										onkeydown={(e) =>
											e.key === 'Enter' &&
											(expandedAlbumId = expandedAlbumId === albumId ? null : albumId)}
									>
											<div class="album-content">
												<div class="album-info">
													<span class="name">{album.name}</span>
													<span class="artist">by {album.artist.name}</span>
												</div>
												{#if album.isNowPlaying}
													<span class="playing-badge">NOW</span>
												{/if}
												<div class="album-meta">
													{#if album.appleMusicData}
														<span class="meta-item">
															{album.appleMusicData.tracks?.length || 0} tracks
														</span>
														<span class="meta-item">
															{#if album.appleMusicData.previewUrl}<CheckIcon class="icon success inline" /> Preview{:else}<XIcon class="icon error inline" /> No preview{/if}
														</span>
													{:else}
														<span class="meta-item">No Apple Music data</span>
													{/if}
												</div>
											</div>
											<button 
												class="clear-cache-btn"
												onclick={(e) => { e.stopPropagation(); clearAlbumCache(album) }}
												disabled={clearingAlbums.has(albumId)}
												title="Clear Apple Music cache for this album"
											>
												{#if clearingAlbums.has(albumId)}
													<LoaderIcon class="icon spinning" />
												{:else}
													<TrashIcon class="icon" />
												{/if}
											</button>
										</div>
										
										{#if expandedAlbumId === albumId}
											<div class="album-details">
												{#if album.appleMusicData}
													{#if album.appleMusicData.searchMetadata}
														<h5>Search Information</h5>
														<div class="search-metadata">
															<p><strong>Search Query:</strong> <code>{album.appleMusicData.searchMetadata.searchQuery}</code></p>
															<p><strong>Search Time:</strong> {new Date(album.appleMusicData.searchMetadata.searchTime).toLocaleString()}</p>
															<p><strong>Status:</strong> 
																{#if album.appleMusicData.searchMetadata.found}
																	<CheckIcon class="icon success inline" /> Found
																{:else}
																	<XIcon class="icon error inline" /> Not Found
																{/if}
															</p>
															{#if album.appleMusicData.searchMetadata.error}
																<p><strong>Error:</strong> <span class="error-text">{album.appleMusicData.searchMetadata.error}</span></p>
															{/if}
														</div>
													{/if}
													
													{#if album.appleMusicData.appleMusicId}
														<h5>Apple Music Details</h5>
														<p><strong>Apple Music ID:</strong> {album.appleMusicData.appleMusicId}</p>
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
													<p><strong>Preview URL:</strong> <code>{album.appleMusicData.previewUrl}</code></p>
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
																		<span class="track-duration">{Math.floor(track.durationMs / 60000)}:{String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, '0')}</span>
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
													<p class="no-data">This album was not searched in Apple Music or the search is pending.</p>
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
								<button 
									onclick={clearAllMusicCache}
									disabled={isClearing}
									class="clear-all-btn"
								>
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
								
								<button 
									onclick={() => searchModal?.open()}
									class="search-btn"
								>
									Test Apple Music Search
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
		font-size: 12px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(10px);
		transition: all 0.2s ease;
		
		&.minimized {
			width: auto;
			max-height: auto;
		}
	}
	
	.debug-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit * 1.5;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		cursor: pointer;
		user-select: none;
		
		h3 {
			margin: 0;
			font-size: 14px;
			font-weight: 600;
		}
		
		.minimize-btn {
			background: none;
			border: none;
			color: white;
			font-size: 12px;
			cursor: pointer;
			padding: 4px 8px;
			border-radius: 4px;
			transition: background 0.2s;
			
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
			font-size: 12px;
			font-weight: 500;
			transition: all 0.2s;
			
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
		padding: $unit * 2;
	}
	
	.section {
		margin-bottom: $unit * 2;
		
		&:last-child {
			margin-bottom: 0;
		}
		
		h4 {
			margin: 0 0 $unit 0;
			color: #87ceeb;
			font-size: 13px;
			font-weight: 600;
		}
		
		p {
			margin: $unit-half 0;
			line-height: 1.4;
		}
		
		.connected {
			color: #4caf50;
		}
		
		.flash {
			animation: flash 0.5s ease-out;
		}
	}
	
	.now-playing-info {
		background: rgba(255, 255, 255, 0.05);
		padding: $unit;
		border-radius: 6px;
		
		.artist {
			font-weight: 600;
			color: #ffd700;
		}
		
		.album {
			color: #87ceeb;
		}
		
		.track {
			font-size: 11px;
			color: rgba(255, 255, 255, 0.8);
		}
		
		.preview {
			font-size: 11px;
			margin-top: $unit;
		}
	}
	
	.no-music {
		color: rgba(255, 255, 255, 0.5);
		font-style: italic;
	}
	
	.albums-list {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}
	
	.album-item {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		position: relative;
		transition: all 0.2s;
		
		&.playing {
			background: rgba(76, 175, 80, 0.2);
			border: 1px solid rgba(76, 175, 80, 0.5);
		}
		
		&.expanded {
			background: rgba(255, 255, 255, 0.08);
		}
		
		.album-header {
			padding: $unit;
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
			min-width: 0; // Allows text truncation
		}
		
		.album-info {
			display: flex;
			flex-direction: column;
			gap: 2px;
			
			.name {
				font-weight: 600;
				color: #87ceeb;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			
			.artist {
				font-size: 11px;
				color: rgba(255, 255, 255, 0.7);
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}
		
		.playing-badge {
			position: absolute;
			top: $unit;
			right: 40px; // Make room for the clear button
			background: #4caf50;
			color: white;
			padding: 2px 6px;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 600;
		}
		
		.album-meta {
			display: flex;
			gap: $unit * 2;
			margin-top: $unit-half;
			
			.meta-item {
				font-size: 10px;
				color: rgba(255, 255, 255, 0.6);
			}
		}
		
		.clear-cache-btn {
			flex-shrink: 0;
			width: 28px;
			height: 28px;
			padding: 0;
			background: rgba(255, 255, 255, 0.1);
			border: 1px solid rgba(255, 255, 255, 0.2);
			border-radius: 4px;
			color: white;
			font-size: 14px;
			cursor: pointer;
			transition: all 0.2s;
			display: flex;
			align-items: center;
			justify-content: center;
			
			&:hover:not(:disabled) {
				background: rgba(255, 59, 48, 0.2);
				border-color: rgba(255, 59, 48, 0.5);
			}
			
			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}
		
		.album-details {
			padding: $unit * 2;
			border-top: 1px solid rgba(255, 255, 255, 0.1);
			
			h5 {
				margin: 0 0 $unit 0;
				color: #87ceeb;
				font-size: 13px;
				font-weight: 600;
			}
			
			h6 {
				margin: $unit * 1.5 0 $unit 0;
				color: #ffd700;
				font-size: 12px;
				font-weight: 600;
			}
			
			p {
				margin: $unit-half 0;
				font-size: 11px;
				line-height: 1.5;
				
				strong {
					color: rgba(255, 255, 255, 0.8);
					margin-right: $unit-half;
				}
			}
			
			code {
				background: rgba(255, 255, 255, 0.1);
				padding: 2px 4px;
				border-radius: 3px;
				font-size: 10px;
				word-break: break-all;
			}
			
			.tracks-section {
				margin-top: $unit * 2;
			}
			
			.tracks-list {
				background: rgba(0, 0, 0, 0.3);
				border-radius: 4px;
				padding: $unit;
				max-height: 200px;
				overflow-y: auto;
			}
			
			.track-item {
				display: flex;
				align-items: center;
				gap: $unit;
				padding: $unit-half 0;
				font-size: 11px;
				
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
					font-size: 10px;
				}
			}
			
			.raw-data {
				margin-top: $unit * 2;
				
				pre {
					background: rgba(0, 0, 0, 0.5);
					border: 1px solid rgba(255, 255, 255, 0.1);
					border-radius: 4px;
					padding: $unit;
					font-size: 10px;
					overflow-x: auto;
					max-height: 300px;
					overflow-y: auto;
					margin: 0;
				}
			}
			
			.search-metadata {
				background: rgba(255, 255, 255, 0.05);
				border-radius: 4px;
				padding: $unit;
				margin-bottom: $unit * 2;
				
				.error-text {
					color: #ff6b6b;
				}
			}
			
			.no-data {
				color: rgba(255, 255, 255, 0.6);
				font-style: italic;
			}
		}
	}
	
	.cache-controls {
		display: flex;
		gap: $unit;
		margin-bottom: $unit * 2;
		
		input {
			flex: 1;
			background: rgba(255, 255, 255, 0.1);
			border: 1px solid rgba(255, 255, 255, 0.2);
			color: white;
			padding: $unit;
			border-radius: 4px;
			font-size: 12px;
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
			border-radius: 4px;
			font-size: 12px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
			
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
		margin-bottom: $unit * 2;
		display: flex;
		flex-wrap: wrap;
		gap: $unit;
		
		.clear-all-btn, .clear-not-found-btn {
			flex: 1;
			min-width: 140px;
			padding: $unit * 1.5;
			background: rgba(255, 59, 48, 0.2);
			border: 1px solid rgba(255, 59, 48, 0.5);
			color: #ff6b6b;
			border-radius: 4px;
			font-size: 12px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
			
			&:hover:not(:disabled) {
				background: rgba(255, 59, 48, 0.3);
				border-color: rgba(255, 59, 48, 0.7);
			}
			
			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}
		
		.clear-not-found-btn {
			background: rgba(255, 149, 0, 0.2);
			border-color: rgba(255, 149, 0, 0.5);
			color: #ff9500;
			
			&:hover:not(:disabled) {
				background: rgba(255, 149, 0, 0.3);
				border-color: rgba(255, 149, 0, 0.7);
			}
		}
		
		.search-btn {
			flex: 1;
			min-width: 140px;
			padding: $unit * 1.5;
			background: rgba(135, 206, 235, 0.2);
			border: 1px solid rgba(135, 206, 235, 0.5);
			color: #87ceeb;
			border-radius: 4px;
			font-size: 12px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
			
			&:hover {
				background: rgba(135, 206, 235, 0.3);
				border-color: rgba(135, 206, 235, 0.7);
			}
		}
	}
	
	.cache-help {
		background: rgba(255, 255, 255, 0.05);
		padding: $unit;
		border-radius: 4px;
		
		p {
			margin: $unit-half 0;
			font-size: 11px;
			color: rgba(255, 255, 255, 0.7);
			
			code {
				background: rgba(255, 255, 255, 0.1);
				padding: 2px 4px;
				border-radius: 3px;
				font-size: 10px;
			}
		}
	}
	
	@keyframes flash {
		0% {
			background: rgba(76, 175, 80, 0.5);
			transform: scale(1.05);
		}
		100% {
			background: transparent;
			transform: scale(1);
		}
	}
	
	.debug-panel :global(.icon) {
		width: 14px;
		height: 14px;
		display: inline-block;
		vertical-align: text-bottom;
		
		&:global(.success) {
			color: #4caf50;
		}
		
		&:global(.error) {
			color: #ff6b6b;
		}
		
		&:global(.inline) {
			width: 12px;
			height: 12px;
		}
		
		&:global(.spinning) {
			animation: spin 1s linear infinite;
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
	
	.debug-header h3 {
		text-align: center;
		flex: 1;
		margin: 0;
	}
	
	.status {
		display: flex;
		align-items: center;
		gap: 4px;
		
		:global(.status-icon) {
			margin-left: 4px;
		}
	}
	
	.preview {
		display: flex;
		align-items: center;
		gap: 4px;
		
		:global(.icon) {
			margin-left: 4px;
		}
	}
</style>
