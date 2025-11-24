<script lang="ts">
	import BackButton from './BackButton.svelte'

	interface Props {
		title?: string
		caption?: string
		description?: string
		exifData?: Record<string, unknown>
		createdAt?: string
		backHref?: string
		backLabel?: string
		showBackButton?: boolean
		albums?: Array<{ id: number; title: string; slug: string }>
		class?: string
	}

	let {
		title,
		caption,
		description,
		exifData,
		createdAt,
		backHref,
		backLabel,
		showBackButton = false,
		class: className = ''
	}: Props = $props()

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

	const hasDetails = $derived(title || caption || description)
	const hasMetadata = $derived(exifData || createdAt)
</script>

<div class="photo-metadata {className}">
	{#if hasDetails}
		<div class="photo-details">
			{#if title}
				<h1 class="photo-title">{title}</h1>
			{/if}

			{#if caption || description}
				<p class="photo-description">{caption || description}</p>
			{/if}
		</div>
	{/if}

	{#if hasMetadata}
		<div class="metadata-grid {hasDetails ? 'metadata-section' : ''}">
			{#if exifData?.camera}
				<div class="metadata-item">
					<span class="metadata-label">Camera</span>
					<span class="metadata-value">{exifData.camera}</span>
				</div>
			{/if}

			{#if exifData?.lens}
				<div class="metadata-item">
					<span class="metadata-label">Lens</span>
					<span class="metadata-value">{exifData.lens}</span>
				</div>
			{/if}

			{#if exifData?.focalLength}
				<div class="metadata-item">
					<span class="metadata-label">Focal Length</span>
					<span class="metadata-value">{exifData.focalLength}</span>
				</div>
			{/if}

			{#if exifData?.aperture}
				<div class="metadata-item">
					<span class="metadata-label">Aperture</span>
					<span class="metadata-value">{exifData.aperture}</span>
				</div>
			{/if}

			{#if exifData?.shutterSpeed}
				<div class="metadata-item">
					<span class="metadata-label">Shutter Speed</span>
					<span class="metadata-value">{exifData.shutterSpeed}</span>
				</div>
			{/if}

			{#if exifData?.iso}
				<div class="metadata-item">
					<span class="metadata-label">ISO</span>
					<span class="metadata-value">{exifData.iso}</span>
				</div>
			{/if}

			{#if exifData?.dateTaken}
				<div class="metadata-item">
					<span class="metadata-label">Date Taken</span>
					<span class="metadata-value">{formatDate(exifData.dateTaken)}</span>
				</div>
			{:else if createdAt}
				<div class="metadata-item">
					<span class="metadata-label">Date</span>
					<span class="metadata-value">{formatDate(createdAt)}</span>
				</div>
			{/if}

			{#if exifData?.location}
				<div class="metadata-item">
					<span class="metadata-label">Location</span>
					<span class="metadata-value">{exifData.location}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- {#if albums && albums.length > 0}
		<div class="albums-section">
			<h3 class="albums-title">This photo appears in:</h3>
			<div class="albums-list">
				{#each albums as album}
					<a href="/photos/{album.slug}" class="album-link">
						{album.title}
					</a>
				{/each}
			</div>
		</div>
	{/if} -->

	{#if showBackButton && backHref && backLabel}
		<div class="card-footer">
			<BackButton href={backHref} label={backLabel} />
		</div>
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables.scss';
	@import '$styles/mixins.scss';

	.photo-metadata {
		background: $gray-100;
		border: 1px solid $gray-90;
		border-radius: $image-corner-radius;
		padding: $unit-3x;
		padding-bottom: $unit-2x;
		max-width: 700px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;

		@include breakpoint('phone') {
			padding: $unit-3x;
			max-width: 100%;
		}
	}

	.photo-details {
		margin-bottom: $unit-4x;
		padding-bottom: $unit-4x;
		border-bottom: 1px solid $gray-90;
		text-align: center;

		@include breakpoint('phone') {
			margin-bottom: $unit-3x;
			padding-bottom: $unit-3x;
		}

		.photo-title {
			font-size: 1.75rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $gray-10;

			@include breakpoint('phone') {
				font-size: 1.25rem;
				margin-bottom: $unit;
			}
		}

		.photo-description {
			font-size: 1rem;
			color: $gray-30;
			line-height: 1.6;
			margin: 0;

			@include breakpoint('phone') {
				font-size: 0.875rem;
			}
		}
	}

	.metadata-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: $unit-3x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
			gap: $unit-2x;
		}

		&.metadata-section {
			margin-bottom: $unit-4x;

			@include breakpoint('phone') {
				margin-bottom: $unit-3x;
			}
		}
	}

	.metadata-item {
		display: flex;
		flex-direction: column;
		gap: $unit-half;

		.metadata-label {
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: $gray-40;
		}

		.metadata-value {
			font-size: 0.875rem;
			color: $gray-10;
			font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
				monospace;
		}
	}

	.albums-section {
		margin-bottom: $unit-4x;
		padding-bottom: $unit-4x;
		border-bottom: 1px solid $gray-90;

		@include breakpoint('phone') {
			margin-bottom: $unit-3x;
			padding-bottom: $unit-3x;
		}

		.albums-title {
			font-size: 0.875rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: $gray-40;
			margin: 0 0 $unit-2x;
		}

		.albums-list {
			display: flex;
			flex-wrap: wrap;
			gap: $unit $unit-2x;
		}

		.album-link {
			font-size: 0.875rem;
			color: $red-60;
			text-decoration: none;
			transition: color 0.2s ease;

			&:hover {
				color: $red-50;
				text-decoration: underline;
			}

			&:not(:last-child)::after {
				content: ',';
				color: $gray-40;
				margin-left: 2px;
			}
		}
	}

	.card-footer {
		display: flex;
		justify-content: center;

		@include breakpoint('phone') {
			margin-top: $unit-3x;
		}
	}
</style>
