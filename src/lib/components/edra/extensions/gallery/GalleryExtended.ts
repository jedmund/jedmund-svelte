import { SvelteNodeViewRenderer } from 'svelte-tiptap'
import { Node, mergeAttributes } from '@tiptap/core'
import type { Component } from 'svelte'
import type { NodeViewProps } from '@tiptap/core'

export interface GalleryOptions {
	HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		gallery: {
			/**
			 * Insert a gallery
			 */
			setGallery: (options: {
				images: Array<{ id: number; url: string; alt?: string; title?: string }>
			}) => ReturnType
		}
	}
}

export const GalleryExtended = (
	component: Component<NodeViewProps>
): Node<GalleryOptions, unknown> => {
	return Node.create<GalleryOptions>({
		name: 'gallery',

		addOptions() {
			return {
				HTMLAttributes: {}
			}
		},

		addAttributes() {
			return {
				images: {
					default: []
				},
				layout: {
					default: 'grid' // grid, masonry, carousel
				},
				columns: {
					default: 3
				},
				gap: {
					default: '16px'
				}
			}
		},

		parseHTML() {
			return [{ tag: `div[data-type="${this.name}"]` }]
		},

		renderHTML({ HTMLAttributes }) {
			return [
				'div',
				mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
					'data-type': this.name
				})
			]
		},

		group: 'block',
		draggable: true,
		atom: true,

		addNodeView() {
			return SvelteNodeViewRenderer(component)
		},

		addCommands() {
			return {
				setGallery:
					(options) =>
					({ commands }) => {
						return commands.insertContent({
							type: this.name,
							attrs: {
								images: options.images
							}
						})
					}
			}
		}
	})
}
