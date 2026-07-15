import { SvelteNodeViewRenderer } from '$lib/components/edra/tiptap/index.js'
import type { Component } from 'svelte'
import { UrlEmbed } from './UrlEmbed.js'

export const UrlEmbedExtended = (
	component: Component<any>,
	onShowDropdown?: (pos: number, url: string) => void
) =>
	UrlEmbed.configure({ onShowDropdown }).extend({
		addNodeView() {
			return SvelteNodeViewRenderer(component)
		}
	})
