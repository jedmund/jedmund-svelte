<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import MediaExtended from './MediaExtended.svelte'

	// svelte-ignore custom_element_props_identifier
	const { ...rest }: NodeViewProps = $props()

	let mediaRef = $state<HTMLElement>()
</script>

<MediaExtended bind:mediaRef {...rest}>
	{@const node = rest.node}
	<video
		bind:this={mediaRef}
		src={node.attrs.src}
		controls
		title={node.attrs.title}
		preload="metadata"
		playsinline
		style="margin: 0; width: 100%;"
	>
		<track kind="captions" />
	</video>
</MediaExtended>
