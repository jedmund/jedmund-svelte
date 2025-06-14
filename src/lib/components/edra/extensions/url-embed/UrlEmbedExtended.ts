import { mergeAttributes, Node } from '@tiptap/core'
import { SvelteNodeViewRenderer } from 'svelte-tiptap'

export const UrlEmbedExtended = (component: any) =>
	Node.create({
		name: 'urlEmbed',

		group: 'block',

		atom: true,

		draggable: true,

		addAttributes() {
			return {
				url: {
					default: null
				},
				title: {
					default: null
				},
				description: {
					default: null
				},
				image: {
					default: null
				},
				favicon: {
					default: null
				},
				siteName: {
					default: null
				}
			}
		},

		parseHTML() {
			return [
				{
					tag: 'div[data-url-embed]'
				}
			]
		},

		renderHTML({ HTMLAttributes }) {
			return ['div', mergeAttributes({ 'data-url-embed': '' }, HTMLAttributes)]
		},

		addNodeView() {
			return SvelteNodeViewRenderer(component)
		}
	})
