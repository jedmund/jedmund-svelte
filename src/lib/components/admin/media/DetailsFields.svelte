<script lang="ts">
	import type { Media } from '@prisma/client'
	import type { MediaUsage, AlbumSummary } from '$lib/admin/media/requests'
	import Textarea from '../Textarea.svelte'
	import MediaUsageList from '../MediaUsageList.svelte'
	import AlbumIcon from '$icons/album.svg?component'
	let {
		media,
		description = $bindable(),
		isPhotography = $bindable(),
		isSaving,
		usage,
		loadingUsage,
		albums,
		onAlbums
	}: {
		media: Media
		description: string
		isPhotography: boolean
		isSaving: boolean
		usage: MediaUsage[]
		loadingUsage: boolean
		albums: AlbumSummary[]
		onAlbums: () => void
	} = $props()
</script>

<div class="pane-body-content">
	<!-- Photography Toggle -->
	<div class="photography-toggle">
		<label class="toggle-label">
			<input
				type="checkbox"
				bind:checked={isPhotography}
				disabled={isSaving}
				class="toggle-input"
			/>
			<div class="toggle-content">
				<span class="toggle-title">Show in Photos</span>
				<span class="toggle-description">This photo will be displayed in Photos</span>
			</div>
			<span class="toggle-slider"></span>
		</label>
	</div>

	<!-- Edit Form -->
	<div class="edit-form">
		<Textarea
			label="Description"
			bind:value={description}
			placeholder="Describe this image (used for alt text and captions)"
			rows={4}
			disabled={isSaving}
			fullWidth
		/>

		<!-- Usage Tracking -->
		<div class="usage-section">
			<div class="section-header">
				<h4>Used In</h4>
				{#if media.mimeType?.startsWith('image/')}
					<button class="add-album-button" type="button" onclick={onAlbums} title="Manage albums">
						<AlbumIcon />
						<span>Albums</span>
					</button>
				{/if}
			</div>
			<MediaUsageList {usage} loading={loadingUsage} />

			<!-- Albums list -->
			{#if albums.length > 0}
				<div class="albums-inline">
					<h4>Albums</h4>
					<div class="album-tags">
						{#each albums as album}
							<a href="/admin/albums/{album.id}/edit" class="album-tag">
								{album.title}
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.pane-body-content {
		padding: $unit-3x;
		display: flex;
		flex-direction: column;
		gap: $unit-6x;
	}
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;

		h4 {
			font-size: 1rem;
			font-weight: 600;
			margin: 0;
			color: $gray-20;
		}
	}
	.photography-toggle {
		.toggle-label {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: $unit-3x;
			cursor: pointer;
			user-select: none;
		}

		.toggle-input {
			position: absolute;
			opacity: 0;
			pointer-events: none;

			&:checked + .toggle-content + .toggle-slider {
				background-color: $blue-60;

				&::before {
					transform: translateX($unit-20px);
				}
			}

			&:disabled + .toggle-content + .toggle-slider {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.toggle-slider {
			position: relative;
			width: $unit-5x + $unit-half;
			height: $unit-3x;
			background-color: $gray-80;
			border-radius: $corner-radius-xl;
			transition: background-color 0.2s ease;
			flex-shrink: 0;

			&::before {
				content: '';
				position: absolute;
				top: $unit-2px;
				left: $unit-2px;
				width: $unit-20px;
				height: $unit-20px;
				background-color: white;
				border-radius: 50%;
				transition: transform 0.2s ease;
				box-shadow: 0 $unit-1px $unit-3px rgba(0, 0, 0, 0.1);
			}
		}

		.toggle-content {
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.toggle-title {
				font-weight: 500;
				color: $gray-10;
				font-size: 0.875rem;
			}

			.toggle-description {
				font-size: 0.75rem;
				color: $gray-50;
				line-height: 1.4;
			}
		}
	}
	.usage-section {
		.section-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: $unit-2x;

			h4 {
				margin: 0;
				font-size: 1rem;
				font-weight: 600;
				color: $gray-20;
			}
		}

		.add-album-button {
			display: flex;
			align-items: center;
			gap: $unit-half;
			padding: $unit-half;
			background: transparent;
			border: none;
			border-radius: $corner-radius-sm;
			color: $gray-40;
			cursor: pointer;
			transition: all 0.2s ease;
			font-size: 0.875rem;
			font-weight: 500;

			&:hover {
				background: $gray-95;
				color: $gray-20;
			}

			:global(svg) {
				width: $unit-2x;
				height: $unit-2x;
				flex-shrink: 0;
			}
		}
	}
	.albums-inline {
		margin-top: $unit-4x;

		h4 {
			font-size: 1rem;
			font-weight: 600;
			color: $gray-20;
			margin: 0 0 $unit-2x 0;
		}
	}
	.album-tags {
		display: flex;
		flex-wrap: wrap;
		gap: $unit;
	}
	.album-tag {
		display: inline-flex;
		align-items: center;
		padding: $unit-half $unit-2x;
		background: $gray-95;
		border: $unit-1px solid $gray-90;
		border-radius: $unit-20px;
		color: $gray-20;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-90;
			border-color: $gray-85;
			color: $gray-10;
		}
	}
</style>
