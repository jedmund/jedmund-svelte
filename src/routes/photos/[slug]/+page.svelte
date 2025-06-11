<script lang="ts">
	import PhotoGrid from '$components/PhotoGrid.svelte'
	import BackButton from '$components/BackButton.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const album = $derived(data.album)
	const error = $derived(data.error)

	// Transform album data to PhotoItem format for PhotoGrid
	const photoItems = $derived(
		album?.photos?.map((photo: any) => ({
			id: `photo-${photo.id}`,
			src: photo.url,
			alt: photo.caption || photo.filename,
			caption: photo.caption,
			width: photo.width || 400,
			height: photo.height || 400
		})) ?? []
	)

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}
</script>

<svelte:head>
	{#if album}
		<title>{album.title} - Photos</title>
		<meta name="description" content={album.description || `Photo album: ${album.title}`} />
	{:else}
		<title>Album Not Found - Photos</title>
	{/if}
</svelte:head>

{#if error}
	<div class="error-container">
		<div class="error-message">
			<h1>Album Not Found</h1>
			<p>{error}</p>
			<BackButton href="/photos" label="Back to Photos" />
		</div>
	</div>
{:else if album}
	<div class="album-page">
		<!-- Album Card -->
		<div class="album-card">
			<h1 class="album-title">{album.title}</h1>

			{#if album.description}
				<p class="album-description">{album.description}</p>
			{/if}

			<div class="album-meta">
				{#if album.date}
					<span class="meta-item">📅 {formatDate(album.date)}</span>
				{/if}
				{#if album.location}
					<span class="meta-item">📍 {album.location}</span>
				{/if}
				<span class="meta-item"
					>📷 {album.photos?.length || 0} photo{(album.photos?.length || 0) !== 1 ? 's' : ''}</span
				>
			</div>
		</div>

		<!-- Photo Grid -->
		{#if photoItems.length > 0}
			<PhotoGrid {photoItems} albumSlug={album.slug} />
		{:else}
			<div class="empty-album">
				<p>This album doesn't contain any photos yet.</p>
			</div>
		{/if}
	</div>
{/if}

<style lang="scss">
	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: $unit-6x $unit-3x;
	}

	.error-message {
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

	.album-page {
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		padding: $unit-4x $unit-3x;

		@include breakpoint('phone') {
			padding: $unit-3x $unit-2x;
		}
	}

	.album-card {
		background: $grey-100;
		border: 1px solid $grey-90;
		border-radius: $card-corner-radius;
		padding: $unit-6x;
		margin-bottom: $unit-3x;
		text-align: center;

		@include breakpoint('tablet') {
			margin-bottom: $unit-2x;
		}

		@include breakpoint('phone') {
			padding: $unit-4x $unit-3x;
		}
	}

	.album-title {
		font-size: 2.25rem;
		font-weight: 700;
		margin: 0 0 $unit-2x;
		color: $grey-10;

		@include breakpoint('phone') {
			font-size: 1.875rem;
		}
	}

	.album-description {
		font-size: 1rem;
		color: $grey-30;
		margin: 0 0 $unit-4x;
		line-height: 1.5;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;

		@include breakpoint('phone') {
			font-size: 1rem;
			margin-bottom: $unit-3x;
		}
	}

	.album-meta {
		display: flex;
		justify-content: center;
		gap: $unit-3x;
		flex-wrap: wrap;

		.meta-item {
			font-size: 0.875rem;
			color: $grey-40;
			display: flex;
			align-items: center;
			gap: $unit-half;
		}

		@include breakpoint('phone') {
			gap: $unit-2x;
		}
	}

	.empty-album {
		text-align: center;
		padding: $unit-6x $unit-3x;
		color: $grey-40;
	}
</style>
