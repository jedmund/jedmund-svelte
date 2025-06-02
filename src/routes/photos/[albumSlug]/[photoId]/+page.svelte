<script lang="ts">
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const photo = $derived(data.photo)
	const album = $derived(data.album)
	const navigation = $derived(data.navigation)
	const error = $derived(data.error)

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

	const formatExif = (exifData: any) => {
		if (!exifData) return null

		const formatSpeed = (speed: string) => {
			if (speed?.includes('/')) return speed
			if (speed?.includes('s')) return speed
			return speed ? `1/${speed}s` : null
		}

		return {
			camera: exifData.camera,
			lens: exifData.lens,
			settings: [
				exifData.focalLength,
				exifData.aperture,
				formatSpeed(exifData.shutterSpeed),
				exifData.iso ? `ISO ${exifData.iso}` : null
			]
				.filter(Boolean)
				.join(' • '),
			location: exifData.location,
			dateTaken: exifData.dateTaken
		}
	}

	const exif = $derived(photo ? formatExif(photo.exifData) : null)
</script>

<svelte:head>
	{#if photo && album}
		<title
			>{photo.title || photo.caption || `Photo ${navigation?.currentIndex}`} - {album.title}</title
		>
		<meta
			name="description"
			content={photo.description || photo.caption || `Photo from ${album.title}`}
		/>

		<!-- Open Graph meta tags -->
		<meta
			property="og:title"
			content="{photo.title ||
				photo.caption ||
				`Photo ${navigation?.currentIndex}`} - {album.title}"
		/>
		<meta
			property="og:description"
			content={photo.description || photo.caption || `Photo from ${album.title}`}
		/>
		<meta property="og:type" content="article" />
		<meta property="og:image" content={photo.url} />

		<!-- Article meta -->
		<meta property="article:author" content="jedmund" />
		{#if exif?.dateTaken}
			<meta property="article:published_time" content={exif.dateTaken} />
		{/if}
	{:else}
		<title>Photo Not Found</title>
	{/if}
</svelte:head>

{#if error || !photo || !album}
	<div class="error-container">
		<div class="error-content">
			<h1>Photo Not Found</h1>
			<p>{error || "The photo you're looking for doesn't exist."}</p>
			<a href="/photos" class="back-link">← Back to Photos</a>
		</div>
	</div>
{:else}
	<div class="photo-page">
		<!-- Navigation Header -->
		<header class="photo-header">
			<nav class="breadcrumb">
				<a href="/photos">Photos</a>
				<span class="separator">→</span>
				<a href="/photos/{album.slug}">{album.title}</a>
				<span class="separator">→</span>
				<span class="current">Photo {navigation.currentIndex} of {navigation.totalCount}</span>
			</nav>

			<div class="photo-nav">
				{#if navigation.prevPhoto}
					<a href="/photos/{album.slug}/{navigation.prevPhoto.id}" class="nav-btn prev">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<path
								d="M12.5 15L7.5 10L12.5 5"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Previous
					</a>
				{:else}
					<div class="nav-btn disabled">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<path
								d="M12.5 15L7.5 10L12.5 5"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Previous
					</div>
				{/if}

				{#if navigation.nextPhoto}
					<a href="/photos/{album.slug}/{navigation.nextPhoto.id}" class="nav-btn next">
						Next
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<path
								d="M7.5 5L12.5 10L7.5 15"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</a>
				{:else}
					<div class="nav-btn disabled">
						Next
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<path
								d="M7.5 5L12.5 10L7.5 15"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</div>
				{/if}
			</div>
		</header>

		<!-- Photo Display -->
		<main class="photo-main">
			<div class="photo-container">
				<img
					src={photo.url}
					alt={photo.caption || photo.title || 'Photo'}
					class="main-photo"
					loading="eager"
				/>
			</div>
		</main>

		<!-- Photo Details -->
		<aside class="photo-details">
			<div class="details-content">
				{#if photo.title}
					<h1 class="photo-title">{photo.title}</h1>
				{/if}

				{#if photo.caption}
					<p class="photo-caption">{photo.caption}</p>
				{/if}

				{#if photo.description}
					<p class="photo-description">{photo.description}</p>
				{/if}

				{#if exif}
					<div class="photo-exif">
						<h3>Photo Details</h3>

						{#if exif.camera}
							<div class="exif-item">
								<span class="label">Camera</span>
								<span class="value">{exif.camera}</span>
							</div>
						{/if}

						{#if exif.lens}
							<div class="exif-item">
								<span class="label">Lens</span>
								<span class="value">{exif.lens}</span>
							</div>
						{/if}

						{#if exif.settings}
							<div class="exif-item">
								<span class="label">Settings</span>
								<span class="value">{exif.settings}</span>
							</div>
						{/if}

						{#if exif.location}
							<div class="exif-item">
								<span class="label">Location</span>
								<span class="value">{exif.location}</span>
							</div>
						{/if}

						{#if exif.dateTaken}
							<div class="exif-item">
								<span class="label">Date Taken</span>
								<span class="value">{formatDate(exif.dateTaken)}</span>
							</div>
						{/if}
					</div>
				{/if}

				<div class="photo-actions">
					<a href="/photos/{album.slug}" class="back-to-album">← Back to {album.title}</a>
				</div>
			</div>
		</aside>
	</div>
{/if}

<style lang="scss">
	:global(main) {
		padding: 0;
	}

	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: $unit-6x $unit-3x;
	}

	.error-content {
		text-align: center;
		max-width: 500px;

		h1 {
			font-size: 1.75rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $red-60;
		}

		p {
			margin: 0 0 $unit-3x;
			color: $grey-40;
			line-height: 1.5;
		}
	}

	.back-link {
		color: $grey-40;
		text-decoration: none;
		font-size: 0.925rem;
		transition: color 0.2s ease;

		&:hover {
			color: $grey-20;
		}
	}

	.photo-page {
		min-height: 100vh;
		display: grid;
		grid-template-areas:
			'header header'
			'main details';
		grid-template-columns: 1fr 400px;
		grid-template-rows: auto 1fr;

		@include breakpoint('tablet') {
			grid-template-areas:
				'header'
				'main'
				'details';
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr auto;
		}
	}

	.photo-header {
		grid-area: header;
		background: $grey-100;
		border-bottom: 1px solid $grey-90;
		padding: $unit-3x $unit-4x;
		display: flex;
		justify-content: space-between;
		align-items: center;

		@include breakpoint('phone') {
			padding: $unit-2x;
			flex-direction: column;
			gap: $unit-2x;
			align-items: stretch;
		}
	}

	.breadcrumb {
		font-size: 0.875rem;
		color: $grey-40;

		a {
			color: $grey-40;
			text-decoration: none;
			transition: color 0.2s ease;

			&:hover {
				color: $grey-20;
			}
		}

		.separator {
			margin: 0 $unit;
		}

		.current {
			color: $grey-20;
		}
	}

	.photo-nav {
		display: flex;
		gap: $unit-2x;

		@include breakpoint('phone') {
			justify-content: space-between;
		}
	}

	.nav-btn {
		display: flex;
		align-items: center;
		gap: $unit;
		padding: $unit $unit-2x;
		border-radius: $unit;
		border: 1px solid $grey-85;
		background: $grey-100;
		color: $grey-20;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;

		&:hover:not(.disabled) {
			border-color: $grey-70;
			background: $grey-95;
		}

		&.disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&.prev svg {
			order: -1;
		}

		&.next svg {
			order: 1;
		}
	}

	.photo-main {
		grid-area: main;
		background: $grey-95;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $unit-4x;
		min-height: 60vh;

		@include breakpoint('tablet') {
			min-height: 50vh;
		}

		@include breakpoint('phone') {
			padding: $unit-2x;
		}
	}

	.photo-container {
		max-width: 100%;
		max-height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.main-photo {
		max-width: 100%;
		max-height: 80vh;
		width: auto;
		height: auto;
		border-radius: $unit;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
		object-fit: contain;

		@include breakpoint('tablet') {
			max-height: 60vh;
		}
	}

	.photo-details {
		grid-area: details;
		background: $grey-100;
		border-left: 1px solid $grey-90;
		overflow-y: auto;

		@include breakpoint('tablet') {
			border-left: none;
			border-top: 1px solid $grey-90;
		}
	}

	.details-content {
		padding: $unit-4x;

		@include breakpoint('phone') {
			padding: $unit-3x $unit-2x;
		}
	}

	.photo-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 $unit-2x;
		color: $grey-10;
	}

	.photo-caption {
		font-size: 1.125rem;
		color: $grey-20;
		margin: 0 0 $unit-3x;
		line-height: 1.5;
	}

	.photo-description {
		font-size: 1rem;
		color: $grey-30;
		margin: 0 0 $unit-4x;
		line-height: 1.6;
	}

	.photo-exif {
		margin-bottom: $unit-4x;

		h3 {
			font-size: 1rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $grey-10;
		}
	}

	.exif-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: $unit;
		gap: $unit-2x;

		.label {
			font-size: 0.875rem;
			color: $grey-50;
			font-weight: 500;
			flex-shrink: 0;
		}

		.value {
			font-size: 0.875rem;
			color: $grey-20;
			text-align: right;
			word-break: break-word;
		}
	}

	.photo-actions {
		padding-top: $unit-3x;
		border-top: 1px solid $grey-90;
	}

	.back-to-album {
		color: $grey-40;
		text-decoration: none;
		font-size: 0.925rem;
		font-weight: 500;
		transition: color 0.2s ease;

		&:hover {
			color: $grey-20;
		}
	}
</style>
