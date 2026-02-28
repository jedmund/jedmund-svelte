<script lang="ts">
	import AvatarIllo from '$illos/jedmund.svg?component'

	interface EmbedData {
		url: string
		title?: string
		description?: string
		image?: string
		domain?: string
	}

	interface Props {
		text: string
		images?: { url: string; alt: string }[]
		videos?: { url: string }[]
		linkUrl?: string
		embed?: EmbedData
	}

	let { text, images = [], videos = [], linkUrl, embed }: Props = $props()

	let mediaCount = $derived(images.length + videos.length)
	let isSingle = $derived(mediaCount === 1)
	let showEmbed = $derived(mediaCount === 0 && !!embed)
</script>

<div class="preview-wrapper">
	<div class="preview-card">
		<div class="post-header">
			<div class="avatar">
				<AvatarIllo />
			</div>
			<div class="user-info">
				<span class="display-name">Justin Edmund</span>
				<span class="handle">@jedmund</span>
			</div>
		</div>

		{#if text || linkUrl}
			<p class="preview-text">
				{#if text}{text}{/if}{#if text && linkUrl}{'\n\n'}{/if}{#if linkUrl}<span
						class="preview-link">{linkUrl}</span
					>{/if}
			</p>
		{/if}

		{#if mediaCount > 0}
			<div class="media-grid" class:single={isSingle} class:multi={mediaCount >= 2}>
				{#each images as img}
					<div class="media-thumb">
						<img src={img.url} alt={img.alt} />
					</div>
				{/each}
				{#each videos as vid}
					<div class="media-thumb video-thumb">
						<video src={vid.url} preload="metadata" muted></video>
						<div class="play-overlay">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
								<path d="M8 5v14l11-7L8 5z" fill="white" />
							</svg>
						</div>
					</div>
				{/each}
			</div>
		{:else if showEmbed}
			<div class="embed-card">
				{#if embed?.image}
					<div class="embed-image">
						<img src={embed.image} alt={embed.title || ''} />
					</div>
				{/if}
				<div class="embed-text">
					{#if embed?.title}
						<span class="embed-title">{embed.title}</span>
					{/if}
					{#if embed?.description}
						<span class="embed-description">{embed.description}</span>
					{/if}
					<span class="embed-domain">{embed?.domain || ''}</span>
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.preview-wrapper {
		display: flex;
		justify-content: center;
		padding: $unit-4x;
		background: $gray-95;
		border-radius: $corner-radius;
	}

	.preview-card {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		background: white;
		border: 1px solid $gray-90;
		border-radius: 12px;
		padding: $unit-3x;
		width: 400px;
		max-width: 100%;
	}

	.post-header {
		display: flex;
		align-items: center;
		gap: $unit-half + $unit;
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;

		:global(svg) {
			width: 100%;
			height: 100%;
			display: block;
		}
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.display-name {
		font-size: $font-size-small;
		font-weight: 600;
		color: $gray-10;
		line-height: 1.2;
	}

	.handle {
		font-size: $font-size-extra-small;
		color: $gray-50;
		line-height: 1.2;
	}

	.preview-text {
		margin: 0;
		font-size: $font-size-small;
		color: $gray-20;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.preview-link {
		color: $blue-50;
	}

	.media-grid {
		display: grid;
		gap: 2px;
		grid-template-columns: 1fr;
		border-radius: $corner-radius-sm;
		overflow: hidden;

		&.single .media-thumb {
			aspect-ratio: 1.91 / 1;
		}

		&.multi {
			grid-template-columns: 1fr 1fr;

			.media-thumb {
				aspect-ratio: 1 / 1;
			}
		}
	}

	.media-thumb {
		position: relative;
		overflow: hidden;

		img,
		video {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
	}

	.video-thumb .play-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 40px;
		height: 40px;
		background: rgba($gray-00, 0.6);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.embed-card {
		border: 1px solid $gray-90;
		border-radius: $corner-radius-sm;
		overflow: hidden;
	}

	.embed-image {
		aspect-ratio: 1.91 / 1;
		overflow: hidden;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
	}

	.embed-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: $unit-half + $unit;
		border-top: 1px solid $gray-90;
	}

	.embed-title {
		font-size: $font-size-small;
		font-weight: 600;
		color: $gray-20;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.embed-description {
		font-size: $font-size-extra-small;
		color: $gray-40;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.embed-domain {
		font-size: $font-size-extra-small;
		color: $gray-50;
		margin-top: 2px;
	}
</style>
