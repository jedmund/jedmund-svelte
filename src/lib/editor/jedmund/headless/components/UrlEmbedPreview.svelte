<script lang="ts">
	let {
		attributes,
		status,
		openLink,
		retryFetch
	}: {
		attributes: Record<string, string>
		status: 'idle' | 'loading' | 'error'
		openLink: () => void
		retryFetch: (event: MouseEvent) => void
	} = $props()
	const getDomain = (url: string) => {
		try {
			const urlObj = new URL(url)
			return urlObj.hostname.replace('www.', '')
		} catch {
			return ''
		}
	}

	const decodeHtmlEntities = (text: string) => {
		if (!text) return ''
		const textarea = document.createElement('textarea')
		textarea.innerHTML = text
		return textarea.value
	}
</script>

<button type="button" class="edra-url-embed-content" onclick={openLink}>
	{#if attributes.image}
		<div class="edra-url-embed-image">
			<img src={attributes.image} alt={attributes.title || 'Link preview'} />
		</div>
	{:else if status === 'loading'}
		<div class="edra-url-embed-image edra-url-embed-image-skeleton" aria-hidden="true"></div>
	{/if}
	<div class="edra-url-embed-text">
		<div class="edra-url-embed-meta">
			{#if attributes.favicon}
				<img src={attributes.favicon} alt="" class="edra-url-embed-favicon" />
			{/if}
			<span class="edra-url-embed-domain"
				>{attributes.siteName
					? decodeHtmlEntities(attributes.siteName)
					: getDomain(attributes.url)}</span
			>
			{#if status === 'loading' && !attributes.title}
				<span class="edra-url-embed-status">Fetching preview…</span>
			{:else if status === 'error' && !attributes.title}
				<span
					class="edra-url-embed-retry"
					role="button"
					tabindex="0"
					onclick={retryFetch}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') retryFetch(e as unknown as MouseEvent)
					}}>Couldn't load preview — Retry</span
				>
			{/if}
		</div>
		{#if attributes.title}
			<h3 class="edra-url-embed-title">{decodeHtmlEntities(attributes.title)}</h3>
		{/if}
		{#if attributes.description}
			<p class="edra-url-embed-description">{decodeHtmlEntities(attributes.description)}</p>
		{/if}
	</div>
</button>

<style lang="scss">
	.edra-url-embed-content {
		display: flex;
		width: 100%;
		background: $gray-95;
		border-radius: $corner-radius;
		overflow: hidden;
		border: $unit-1px solid $gray-85;
		padding: 0;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
		/* Reset button styles that might be inherited */
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;

		&:hover {
			border-color: $gray-60;
			transform: translateY(-$unit-1px);
			box-shadow: 0 $unit-2px $unit rgba(0, 0, 0, 0.1);
		}

		&:focus {
			outline: none;
		}
	}

	.edra-url-embed-image {
		flex-shrink: 0;
		width: $unit-20x + $unit;
		height: $unit-18x + $unit-6px;
		overflow: hidden;
		background: $gray-80;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.edra-url-embed-image-skeleton {
		background: linear-gradient(90deg, $gray-85 0%, $gray-90 50%, $gray-85 100%);
		background-size: 200% 100%;
		animation: edra-url-embed-shimmer 1.2s ease-in-out infinite;
	}

	@keyframes edra-url-embed-shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.edra-url-embed-status {
		font-style: italic;
		color: $gray-50;
	}

	.edra-url-embed-retry {
		color: $primary-color;
		cursor: pointer;
		text-decoration: underline;

		&:hover {
			text-decoration: none;
		}
	}

	.edra-url-embed-text {
		flex: 1;
		padding: $unit-2x;
		display: flex;
		flex-direction: column;
		gap: $unit;
		min-width: 0;
	}

	.edra-url-embed-meta {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: $font-size-extra-small;
		color: $gray-40;
	}

	.edra-url-embed-favicon {
		width: $unit-2x;
		height: $unit-2x;
		flex-shrink: 0;
	}

	.edra-url-embed-domain {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.edra-url-embed-title {
		margin: 0;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-10;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}

	.edra-url-embed-description {
		margin: 0;
		font-size: $font-size-small;
		color: $gray-30;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}

	/* Mobile styles */
	@media (max-width: 640px) {
		.edra-url-embed-content {
			flex-direction: column;
		}

		.edra-url-embed-image {
			width: 100%;
			height: $unit-20x + $unit;
		}
	}
</style>
