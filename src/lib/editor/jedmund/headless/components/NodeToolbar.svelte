<script lang="ts">
	import { type Snippet } from 'svelte'
	import tippy, { type Instance } from 'tippy.js'
	import 'tippy.js/dist/tippy.css'
	let {
		anchor,
		selected,
		children
	}: { anchor: HTMLElement | undefined; selected: boolean; children: Snippet } = $props()
	let toolbar = $state<HTMLDivElement>()
	let instance = $state<Instance>()
	$effect(() => {
		if (!anchor || !toolbar) return
		const popup = tippy(anchor, {
			content: toolbar,
			interactive: true,
			trigger: 'mouseenter focusin',
			placement: 'top-end',
			appendTo: () => document.body,
			arrow: false,
			theme: 'media-toolbar',
			delay: [100, 300],
			offset: [0, 8],
			interactiveBorder: 20,
			zIndex: 200,
			maxWidth: 'calc(100vw - 16px)',
			popperOptions: {
				modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }]
			}
		})
		instance = popup
		return () => {
			popup.destroy()
			instance = undefined
		}
	})
	$effect(() => {
		if (selected) instance?.show()
		else instance?.hide()
	})
</script>

<div class="toolbar-source">
	<div bind:this={toolbar} class="edra-media-toolbar" contenteditable="false">
		{@render children()}
	</div>
</div>

<style>
	.toolbar-source {
		display: none;
	}
</style>
