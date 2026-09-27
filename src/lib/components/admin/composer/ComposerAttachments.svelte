<script lang="ts">
	import { onDestroy } from 'svelte'
	import type { Media } from '@prisma/client'
	import UnifiedMediaModal from '../UnifiedMediaModal.svelte'
	import MediaDetailsModal from '../MediaDetailsModal.svelte'
	import Button from '../Button.svelte'
	import { createUploadQueue, emptyUploadQueue } from '$lib/admin/media/upload-queue'
	import { uploadComposerPhoto } from '$lib/admin/composer-requests'
	let { photos = $bindable([]) }: { photos?: Media[] } = $props()
	let fileInput: HTMLInputElement | undefined = $state.raw()
	let libraryOpen = $state(false)
	let detailsOpen = $state(false)
	let selected: Media | null = $state(null)
	let uploadState = $state.raw(emptyUploadQueue())
	let delivered = new Set<number>()
	function makeQueue() {
		return createUploadQueue({
			upload: uploadComposerPhoto,
			onChange: (next) => {
				uploadState = next
				for (const entry of next.entries) {
					if (entry.media && !delivered.has(entry.id)) {
						delivered.add(entry.id)
						add(entry.media)
					}
				}
			}
		})
	}
	let queue = makeQueue()
	onDestroy(() => queue.dispose())
	export function upload() {
		if (!uploadState.running) fileInput?.click()
	}
	export function browse() {
		libraryOpen = true
	}
	export function reset() {
		queue.dispose()
		uploadState = emptyUploadQueue()
		delivered = new Set()
		queue = makeQueue()
		libraryOpen = false
		detailsOpen = false
		selected = null
	}
	function add(media: Media | Media[]) {
		const all = Array.isArray(media) ? media : [media]
		const ids = new Set(photos.map((photo) => photo.id))
		photos = [
			...photos,
			...all.filter((photo) => {
				if (ids.has(photo.id)) return false
				ids.add(photo.id)
				return true
			})
		]
	}
	async function handleUpload(event: Event) {
		const input = event.target as HTMLInputElement
		const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'))
		input.value = ''
		queue.add(files)
		await queue.run()
	}

	function onselect(photo: Media) {
		selected = photo
		detailsOpen = true
	}
	function onremove(id: number) {
		photos = photos.filter((photo) => photo.id !== id)
	}
</script>

{#if photos.length > 0}
	<div class="attached-photos">
		{#each photos as photo}
			<div class="photo-item">
				<button
					type="button"
					class="photo-button"
					onclick={() => onselect(photo)}
					title="View media details"
				>
					<img src={photo.url} alt={photo.description || ''} class="photo-preview" />
				</button>
				<button
					type="button"
					class="remove-photo"
					onclick={() => onremove(photo.id)}
					title="Remove photo"
					aria-label="Remove photo"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M4 4L12 12M4 12L12 4"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}

{#if uploadState.errors.length}
	<p role="alert">{uploadState.errors.join('. ')}</p>
	<Button variant="secondary" disabled={uploadState.running} onclick={() => queue.run()}
		>Retry failed uploads</Button
	>
{/if}
<input bind:this={fileInput} type="file" accept="image/*" multiple onchange={handleUpload} hidden />
<UnifiedMediaModal
	bind:isOpen={libraryOpen}
	mode="multiple"
	fileType="image"
	onSelect={add}
	onClose={() => (libraryOpen = false)}
/>
{#if selected}
	<MediaDetailsModal
		bind:isOpen={detailsOpen}
		media={selected}
		onClose={() => {
			detailsOpen = false
			selected = null
		}}
		onUpdate={(updated) => {
			photos = photos.map((photo) => (photo.id === updated.id ? updated : photo))
		}}
	/>
{/if}

<style lang="scss">
	.attached-photos {
		padding: 0 $unit-3x $unit-2x;
		display: flex;
		flex-wrap: wrap;
		gap: $unit;
	}

	.photo-item {
		position: relative;

		.photo-button {
			border: none;
			background: none;
			padding: 0;
			cursor: pointer;
			display: block;
			transition: transform 0.2s ease;

			&:hover {
				transform: scale(1.05);
			}
		}

		:global(.photo-preview) {
			width: 64px;
			height: 64px;
			object-fit: cover;
			border-radius: 12px;
			display: block;
		}

		.remove-photo {
			position: absolute;
			top: -6px;
			right: -6px;
			width: 20px;
			height: 20px;
			border: none;
			border-radius: 50%;
			background: rgba(0, 0, 0, 0.8);
			color: white;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s ease;
			opacity: 0;

			&:hover {
				background: rgba(0, 0, 0, 0.9);
			}

			svg {
				width: 10px;
				height: 10px;
			}
		}

		&:hover .remove-photo {
			opacity: 1;
		}
	}
</style>
