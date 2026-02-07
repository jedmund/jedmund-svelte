<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core';
	import Audio from '@lucide/svelte/icons/audio-lines';
	import UnifiedMediaPlaceholder from './UnifiedMediaPlaceholder.svelte';

	const { editor, deleteNode }: NodeViewProps = $props();
</script>

<UnifiedMediaPlaceholder
	{editor}
	{deleteNode}
	mediaType="audio"
	icon={Audio}
	title="Audio"
	accept="audio/*"
	nodeType="audio"
/>
