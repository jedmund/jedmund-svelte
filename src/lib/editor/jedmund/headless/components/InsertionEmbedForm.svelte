<script lang="ts">
	import type { ContentType } from './insertion-controller.svelte'
	let {
		contentType,
		embedUrl = $bindable(''),
		handleEmbed,
		handleKeydown
	}: {
		contentType: ContentType
		embedUrl: string
		handleEmbed: () => void
		handleKeydown: (event: KeyboardEvent) => void
	} = $props()
</script>

<div class="embed-section">
	{#if contentType === 'location'}
		<p class="section-description">Paste a Google Maps link to embed a location</p>
	{:else}
		<p class="section-description">
			Paste a URL to embed {contentType === 'image' ? 'an' : 'a'}
			{contentType}
		</p>
	{/if}
	<input
		bind:value={embedUrl}
		placeholder={contentType === 'location'
			? 'https://maps.google.com/...'
			: `https://example.com/${contentType}.${contentType === 'image' ? 'jpg' : contentType === 'video' ? 'mp4' : 'mp3'}`}
		class="embed-input"
		onkeydown={handleKeydown}
	/>
	<button type="button" class="embed-btn" onclick={handleEmbed} disabled={!embedUrl.trim()}>
		Embed
	</button>
</div>

<style lang="scss">
	.embed-section {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.section-description {
		margin: 0;
		color: $gray-40;
		font-size: $font-size-small;
	}

	.embed-input {
		flex: 1;
		padding: $unit $unit-2x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		background: $white;

		&:focus {
			outline: none;
			border-color: $primary-color;
		}
	}

	.embed-btn {
		display: flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit $unit-2x;
		border: none;
		border-radius: $corner-radius-sm;
		background: $primary-color;
		color: $white;
		font-size: $font-size-small;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover:not(:disabled) {
			background: color.adjust($primary-color, $lightness: -10%);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
</style>
