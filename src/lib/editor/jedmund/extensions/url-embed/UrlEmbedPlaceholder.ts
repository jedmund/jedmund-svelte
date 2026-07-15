import { mergeAttributes, Node } from '@tiptap/core'
import { SvelteNodeViewRenderer } from '$lib/components/edra/tiptap/index.js'
import type { Component } from 'svelte'

export const UrlEmbedPlaceholder = (component: Component<any>) =>
	Node.create({
		name: 'urlEmbedPlaceholder',

		group: 'block',

		atom: true,

		addAttributes() {
			return {
				url: {
					default: null
				}
			}
		},

		parseHTML() {
			return [
				{
					tag: 'div[data-url-embed-placeholder]'
				}
			]
		},

		renderHTML({ HTMLAttributes }) {
			return ['div', mergeAttributes({ 'data-url-embed-placeholder': '' }, HTMLAttributes)]
		},

		addNodeView() {
			return SvelteNodeViewRenderer(component)
		}
	})
