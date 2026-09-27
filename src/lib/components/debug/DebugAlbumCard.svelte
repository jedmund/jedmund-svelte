<script lang="ts">
	import CheckIcon from '$icons/check.svg?component'
	import XIcon from '$icons/x.svg?component'
	import LoaderIcon from '$icons/loader.svg?component'
	import DebugAlbumDetails from './DebugAlbumDetails.svelte'
	import type { Album } from '$lib/types/lastfm'
	let {
		album,
		expanded,
		clearing,
		onToggle,
		onClear
	}: {
		album: Album
		expanded: boolean
		clearing: boolean
		onToggle: () => void
		onClear: () => void
	} = $props()
</script>

<div class="album-item" class:playing={album.isNowPlaying} class:expanded>
	<div
		class="album-header"
		role="button"
		tabindex="0"
		onclick={() => onToggle()}
		onkeydown={(e) => e.key === 'Enter' && onToggle()}
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
				onClear()
			}}
			disabled={clearing}
			title="Clear Apple Music cache for this album"
		>
			{#if clearing}
				<LoaderIcon class="icon spinning" />
			{:else}
				<XIcon class="icon" />
			{/if}
		</button>
	</div>

	{#if expanded}<DebugAlbumDetails {album} />{/if}
</div>

<style lang="scss">
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
	}
</style>
