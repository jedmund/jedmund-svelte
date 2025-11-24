<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import type { DropdownPosition, ComposerFeatures } from './types'

	interface Props {
		editor: Editor
		position: DropdownPosition
		features: ComposerFeatures
		onDismiss: () => void
		onOpenMediaLibrary: () => void
	}

	let { editor, position, features, onDismiss, onOpenMediaLibrary }: Props = $props()

	function insertMedia(type: string) {
		switch (type) {
			case 'image':
				handleImageInsert()
				break
			case 'gallery':
				editor.chain().focus().insertGalleryPlaceholder().run()
				break
			case 'video':
				editor.chain().focus().insertVideoPlaceholder().run()
				break
			case 'audio':
				editor.chain().focus().insertAudioPlaceholder().run()
				break
			case 'location':
				editor.chain().focus().insertGeolocationPlaceholder().run()
				break
			case 'link':
				editor.chain().focus().insertUrlEmbedPlaceholder().run()
				break
		}
		onDismiss()
	}

	function handleImageInsert() {
		// Get current position before inserting placeholder
		const pos = editor.state.selection.anchor

		// Insert placeholder
		editor.chain().focus().insertImagePlaceholder().run()

		// Store the position for later deletion
		editor.storage.imageModal = { placeholderPos: pos }

		// Notify parent to open media library
		onOpenMediaLibrary()
	}
</script>

<div
	class="media-dropdown-portal"
	style="position: fixed; top: {position.top}px; left: {position.left}px; z-index: 10000;"
>
	<div class="dropdown-menu">
		<button class="dropdown-item" onclick={() => insertMedia('image')}> Image </button>
		<button class="dropdown-item" onclick={() => insertMedia('gallery')}> Gallery </button>
		<button class="dropdown-item" onclick={() => insertMedia('video')}> Video </button>
		<button class="dropdown-item" onclick={() => insertMedia('audio')}> Audio </button>
		<div class="dropdown-separator"></div>
		<button class="dropdown-item" onclick={() => insertMedia('location')}> Location </button>
		{#if features.urlEmbed}
			<button class="dropdown-item" onclick={() => insertMedia('link')}> Link </button>
		{/if}
	</div>
</div>

<style lang="scss">
	@import '$styles/variables';
	@import '$styles/mixins';

	.media-dropdown-portal {
		font-family: inherit;
	}

	.dropdown-menu {
		background: $white;
		border: 1px solid $gray-85;
		border-radius: $corner-radius;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		padding: 4px;
		min-width: 160px;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: 8px 12px;
		text-align: left;
		font-size: 14px;
		color: $gray-10;
		background: transparent;
		border: none;
		border-radius: $corner-radius-sm;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: $gray-95;
			color: $gray-00;
		}

		&:active {
			background: $gray-90;
		}
	}

	.dropdown-separator {
		height: 1px;
		background: $gray-90;
		margin: 4px 0;
	}
</style>
