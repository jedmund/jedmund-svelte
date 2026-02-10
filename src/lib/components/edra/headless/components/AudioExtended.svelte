<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core';
	import MediaExtended from './MediaExtended.svelte';
	import AudioPlayer from '$components/AudioPlayer.svelte';

	const { ...rest }: NodeViewProps = $props();

	let mediaRef = $state<HTMLElement>();
</script>

<MediaExtended bind:mediaRef {...rest}>
	{@const node = rest.node}
	<div bind:this={mediaRef} style="margin: 0; width: 100%;">
		<AudioPlayer
			src={node.attrs.src}
			waveformData={node.attrs.waveformData}
			onWaveformComputed={(data) => {
				rest.updateAttributes({ waveformData: data });
			}}
		/>
	</div>
</MediaExtended>
