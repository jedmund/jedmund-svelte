import { mergeAttributes, Node } from '@tiptap/core'
import { SvelteNodeViewRenderer } from 'svelte-tiptap'

export const UrlEmbedPlaceholder = (component: any) =>
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
