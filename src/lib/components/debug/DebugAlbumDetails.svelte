<script lang="ts">
	import CheckIcon from '$icons/check.svg?component'
	import XIcon from '$icons/x.svg?component'
	import type { Album } from '$lib/types/lastfm'
	let { album }: { album: Album } = $props()
</script>

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
					{new Date(album.appleMusicData.searchMetadata.searchTime).toLocaleString()}
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
						<span class="error-text">{album.appleMusicData.searchMetadata.error}</span>
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
		<p class="no-data">This album was not searched in Apple Music or the search is pending.</p>
	{/if}
</div>

<style lang="scss">
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
</style>
