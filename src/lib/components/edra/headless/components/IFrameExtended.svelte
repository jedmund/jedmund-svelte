<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import MediaExtended from './MediaExtended.svelte'

	// svelte-ignore custom_element_props_identifier
	const { ...rest }: NodeViewProps = $props()

	let mediaRef = $state<HTMLElement>()
</script>

<MediaExtended bind:mediaRef {...rest}>
	{@const node = rest.node}
	<iframe bind:this={mediaRef} {...node.attrs}> </iframe>
</MediaExtended>
