<script lang="ts">
	interface Props {
		featuredImage: string | null
		backgroundColor: string
		logoUrl: string
		showFeaturedImage: boolean
		showBackgroundColor: boolean
		showLogo: boolean
	}

	let {
		featuredImage,
		backgroundColor,
		logoUrl,
		showFeaturedImage,
		showBackgroundColor,
		showLogo
	}: Props = $props()

	// Determine the background to display
	const effectiveBackground = $derived.by(() => {
		// Priority: featured image > background color > fallback
		if (showFeaturedImage && featuredImage) {
			return { type: 'image' as const, value: featuredImage }
		}
		if (showBackgroundColor && backgroundColor && backgroundColor.trim() !== '') {
			return { type: 'color' as const, value: backgroundColor }
		}
		return { type: 'fallback' as const, value: '#f5f5f5' }
	})

	// Determine if we should show the logo
	const shouldShowLogo = $derived(showLogo && logoUrl && logoUrl.trim() !== '')

	// Placeholder icon SVG for when no logo is provided
	const placeholderIcon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
		<path d="M9 9h6M9 12h6M9 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
	</svg>`
</script>

<div
	class="branding-preview"
	class:has-image={effectiveBackground.type === 'image'}
	style:background-color={effectiveBackground.type !== 'image'
		? effectiveBackground.value
		: undefined}
	style:background-image={effectiveBackground.type === 'image'
		? `url(${effectiveBackground.value})`
		: undefined}
>
	{#if shouldShowLogo}
		<img src={logoUrl} alt="Project logo preview" class="preview-logo" />
	{:else if showLogo}
		<!-- Show placeholder when logo toggle is on but no logo provided -->
		<div class="preview-placeholder">
			<!-- svelte-ignore svelte/no-at-html-tags -->
			{@html placeholderIcon}
		</div>
	{/if}
</div>

<style lang="scss">
	.branding-preview {
		width: 100%;
		height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: $card-corner-radius;
		position: relative;
		overflow: hidden;
		margin-bottom: $unit-4x;
		transition: all 0.3s ease;

		@include breakpoint('tablet') {
			height: 250px;
		}

		@include breakpoint('phone') {
			height: 200px;
		}

		&.has-image {
			background-size: cover;
			background-position: center;
			background-repeat: no-repeat;
		}
	}

	.preview-logo {
		width: 85px;
		height: 85px;
		object-fit: contain;

		@include breakpoint('phone') {
			width: 75px;
			height: 75px;
		}

		@include breakpoint('small-phone') {
			width: 65px;
			height: 65px;
		}
	}

	.preview-placeholder {
		width: 85px;
		height: 85px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(0, 0, 0, 0.2);
		opacity: 0.5;

		:global(svg) {
			width: 48px;
			height: 48px;
		}

		@include breakpoint('phone') {
			width: 75px;
			height: 75px;

			:global(svg) {
				width: 42px;
				height: 42px;
			}
		}

		@include breakpoint('small-phone') {
			width: 65px;
			height: 65px;

			:global(svg) {
				width: 38px;
				height: 38px;
			}
		}
	}
</style>
