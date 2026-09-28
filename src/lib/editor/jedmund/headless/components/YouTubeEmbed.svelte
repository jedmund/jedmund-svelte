<script lang="ts">
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal'
	let {
		url,
		editable,
		handleKeydown,
		handleContextMenu,
		onmenu
	}: {
		url: string
		editable: boolean
		handleKeydown: (event: KeyboardEvent) => void
		handleContextMenu: (event: MouseEvent) => void
		onmenu: (position: { x: number; y: number }) => void
	} = $props()
	let showActions = $state(false)
	// Extract video ID from YouTube URL
	const getYouTubeVideoId = (url: string): string | null => {
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
			/youtube\.com\/watch\?.*v=([^&\n?#]+)/
		]

		for (const pattern of patterns) {
			const match = url.match(pattern)
			if (match && match[1]) {
				return match[1]
			}
		}
		return null
	}
	const videoId = $derived(getYouTubeVideoId(url))
</script>

<div
	class="edra-youtube-embed-card"
	onmouseenter={() => (showActions = true)}
	onmouseleave={() => (showActions = false)}
	onkeydown={handleKeydown}
	oncontextmenu={handleContextMenu}
	tabindex="0"
	role="button"
>
	{#if showActions && editable}
		<div class="edra-youtube-embed-actions">
			<button
				type="button"
				onclick={(e) => {
					e.stopPropagation()
					const rect = e.currentTarget.getBoundingClientRect()
					onmenu({ x: rect.left, y: rect.bottom + 4 })
				}}
				class="edra-youtube-embed-action-button"
				title="More options"
			>
				<MoreHorizontal />
			</button>
		</div>
	{/if}

	{#if videoId}
		<div class="edra-youtube-embed-player">
			<iframe
				src="https://www.youtube.com/embed/{videoId}"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				allowfullscreen
				title="YouTube video player"
			></iframe>
		</div>
	{:else}
		<div class="edra-youtube-embed-error">
			<p>Invalid YouTube URL</p>
		</div>
	{/if}
</div>

<style lang="scss">
	/* YouTube embed styles */
	.edra-youtube-embed-card {
		position: relative;
		width: 100%;
		max-width: 800px;
	}

	.edra-youtube-embed-actions {
		position: absolute;
		top: $unit;
		right: $unit;
		display: flex;
		gap: $unit-half;
		background: white;
		padding: $unit-half;
		border-radius: $corner-radius-sm;
		box-shadow: 0 $unit-2px $unit rgba(0, 0, 0, 0.15);
		z-index: 10;
	}

	.edra-youtube-embed-action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: $unit-4x;
		height: $unit-4x;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: $corner-radius-xs;
		cursor: pointer;
		transition: all 0.2s;
		color: $gray-40;

		&:hover {
			background: $gray-95;
			color: $gray-20;
		}

		:global(svg) {
			width: $unit-2x;
			height: $unit-2x;
		}
	}

	.edra-youtube-embed-player {
		position: relative;
		padding-bottom: 56.25%; // 16:9 aspect ratio
		height: 0;
		overflow: hidden;
		background: $gray-95;
		border-radius: $corner-radius;
		border: $unit-1px solid $gray-85;

		iframe {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			border: none;
			border-radius: $corner-radius;
		}
	}

	.edra-youtube-embed-error {
		padding: $unit-6x;
		text-align: center;
		background: $gray-95;
		border: $unit-1px solid $gray-85;
		border-radius: $corner-radius;
		color: $gray-40;
	}

	:global(.edra-url-embed-wrapper.selected) {
		.edra-youtube-embed-player,
		.edra-youtube-embed-error {
			border-color: $primary-color;
			box-shadow: 0 0 0 $unit-3px rgba($primary-color, 0.1);
		}
	}
</style>
