<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core';
	import Video from '@lucide/svelte/icons/video';
	import UnifiedMediaPlaceholder from './UnifiedMediaPlaceholder.svelte';

	const { editor, deleteNode }: NodeViewProps = $props();
</script>

<UnifiedMediaPlaceholder
	{editor}
	{deleteNode}
	mediaType="video"
	icon={Video}
	title="Video"
	accept="video/*"
	nodeType="video"
/>
