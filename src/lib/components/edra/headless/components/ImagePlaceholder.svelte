<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core';
	import Image from '@lucide/svelte/icons/image';
	import UnifiedMediaPlaceholder from './UnifiedMediaPlaceholder.svelte';

	const { editor, deleteNode }: NodeViewProps = $props();
</script>

<UnifiedMediaPlaceholder
	{editor}
	{deleteNode}
	mediaType="image"
	icon={Image}
	title="Image"
	accept="image/*"
	nodeType="image"
/>
