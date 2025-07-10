<script lang="ts">
	import { goto } from '$app/navigation'
	import { createEventDispatcher } from 'svelte'
	import AdminByline from './AdminByline.svelte'

	interface Photo {
		id: number
		url: string
		thumbnailUrl: string | null
		caption: string | null
	}

	interface Album {
		id: number
		slug: string
		title: string
		description: string | null
		date: string | null
		location: string | null
		coverPhotoId: number | null
		status: string
		showInUniverse: boolean
		publishedAt: string | null
		createdAt: string
		updatedAt: string
		photos: Photo[]
		content?: any
		_count: {
			media: number
		}
	}

	interface Props {
		album: Album
		isDropdownActive?: boolean
	}

	let { album, isDropdownActive = false }: Props = $props()

	const dispatch = createEventDispatcher<{
		toggleDropdown: { albumId: number; event: MouseEvent }
		edit: { album: Album; event: MouseEvent }
		togglePublish: { album: Album; event: MouseEvent }
		delete: { album: Album; event: MouseEvent }
	}>()

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString)
		const now = new Date()
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

		if (diffInSeconds < 60) return 'just now'

		const minutes = Math.floor(diffInSeconds / 60)
		if (diffInSeconds < 3600) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`

		const hours = Math.floor(diffInSeconds / 3600)
		if (diffInSeconds < 86400) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

		const days = Math.floor(diffInSeconds / 86400)
		if (diffInSeconds < 2592000) return `${days} ${days === 1 ? 'day' : 'days'} ago`

		const months = Math.floor(diffInSeconds / 2592000)
		if (diffInSeconds < 31536000) return `${months} ${months === 1 ? 'month' : 'months'} ago`

		const years = Math.floor(diffInSeconds / 31536000)
		return `${years} ${years === 1 ? 'year' : 'years'} ago`
	}

	function handleAlbumClick() {
		goto(`/admin/albums/${album.id}/edit`)
	}

	function handleToggleDropdown(event: MouseEvent) {
		dispatch('toggleDropdown', { albumId: album.id, event })
	}

	function handleEdit(event: MouseEvent) {
		dispatch('edit', { album, event })
	}

	function handleTogglePublish(event: MouseEvent) {
		dispatch('togglePublish', { album, event })
	}

	function handleDelete(event: MouseEvent) {
		dispatch('delete', { album, event })
	}

	// Get thumbnail - try cover photo first, then first photo
	function getThumbnailUrl(): string | null {
		if (album.coverPhotoId && album.photos.length > 0) {
			const coverPhoto = album.photos.find((p) => p.id === album.coverPhotoId)
			if (coverPhoto) {
				return coverPhoto.thumbnailUrl || coverPhoto.url
			}
		}

		// Fallback to first photo
		if (album.photos.length > 0) {
			return album.photos[0].thumbnailUrl || album.photos[0].url
		}

		return null
	}

	function getPhotoCount(): number {
		return album._count?.media || 0
	}
</script>

<div
	class="album-item"
	role="button"
	tabindex="0"
	onclick={handleAlbumClick}
	onkeydown={(e) => e.key === 'Enter' && handleAlbumClick()}
>
	<div class="album-thumbnail">
		{#if getThumbnailUrl()}
			<img src={getThumbnailUrl()} alt="{album.title} thumbnail" class="thumbnail-image" />
		{:else}
			<div class="thumbnail-placeholder">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
					<path
						d="M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.11 21 21 20.1 21 19V5C21 3.9 20.11 3 19 3ZM19 19H5V5H19V19ZM13.96 12.29L11.21 15.83L9.25 13.47L6.5 17H17.5L13.96 12.29Z"
						fill="currentColor"
					/>
				</svg>
			</div>
		{/if}
	</div>

	<div class="album-info">
		<h3 class="album-title">{album.title}</h3>
		<AdminByline
			sections={[
				'Album',
				album.status === 'published' ? 'Published' : 'Draft',
				`${getPhotoCount()} ${getPhotoCount() === 1 ? 'photo' : 'photos'}`,
				...(album.content ? ['📖 Story'] : []),
				album.status === 'published' && album.publishedAt
					? `Published ${formatRelativeTime(album.publishedAt)}`
					: `Created ${formatRelativeTime(album.createdAt)}`
			]}
		/>
	</div>

	<div class="dropdown-container">
		<button class="action-button" onclick={handleToggleDropdown} aria-label="Album actions">
			<svg
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle cx="10" cy="4" r="1.5" fill="currentColor" />
				<circle cx="10" cy="10" r="1.5" fill="currentColor" />
				<circle cx="10" cy="16" r="1.5" fill="currentColor" />
			</svg>
		</button>

		{#if isDropdownActive}
			<div class="dropdown-menu">
				<button class="dropdown-item" onclick={handleEdit}> Edit album </button>
				<button class="dropdown-item" onclick={handleTogglePublish}>
					{album.status === 'published' ? 'Unpublish' : 'Publish'} album
				</button>
				<div class="dropdown-divider"></div>
				<button class="dropdown-item delete" onclick={handleDelete}> Delete album </button>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.album-item {
		display: flex;
		box-sizing: border-box;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-2x;
		background: white;
		border-radius: $unit-2x;
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
		text-align: left;

		&:hover {
			background-color: $gray-95;
		}
	}

	.album-thumbnail {
		flex-shrink: 0;
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: $unit;
		overflow: hidden;
		background-color: $gray-90;

		.thumbnail-image {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.thumbnail-placeholder {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			color: $gray-50;
		}
	}

	.album-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: $unit-half;
		min-width: 0;
	}

	.album-title {
		font-size: 1rem;
		font-weight: 600;
		color: $gray-10;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dropdown-container {
		position: relative;
		flex-shrink: 0;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: $unit;
		cursor: pointer;
		color: $gray-30;
		transition: all 0.2s ease;

		&:hover {
			background-color: rgba(0, 0, 0, 0.05);
		}
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: $unit-half;
		background: white;
		border: 1px solid $gray-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		min-width: 180px;
		z-index: 1050;
	}

	.dropdown-item {
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		color: $gray-20;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $gray-95;
		}

		&.delete {
			color: $red-60;
		}
	}

	.dropdown-divider {
		height: 1px;
		background-color: $gray-80;
		margin: $unit-half 0;
	}
</style>
