import { Editor, Node, mergeAttributes, type CommandProps, type NodeViewProps } from '@tiptap/core'
import type { Component } from 'svelte'
import { SvelteNodeViewRenderer } from 'svelte-tiptap'

export interface GalleryPlaceholderOptions {
	HTMLAttributes: Record<string, unknown>
	onSelectImages: (images: Array<Record<string, unknown>>, editor: Editor) => void
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		galleryPlaceholder: {
			/**
			 * Inserts a gallery placeholder
			 */
			insertGalleryPlaceholder: () => ReturnType
		}
	}
}

export const GalleryPlaceholder = (
	component: Component<NodeViewProps>
): Node<GalleryPlaceholderOptions> =>
	Node.create<GalleryPlaceholderOptions>({
		name: 'gallery-placeholder',
		addOptions() {
			return {
				HTMLAttributes: {},
				onSelectImages: () => {}
			}
		},
		parseHTML() {
			return [{ tag: `div[data-type="${this.name}"]` }]
		},

		renderHTML({ HTMLAttributes }) {
			return ['div', mergeAttributes(HTMLAttributes)]
		},
		group: 'block',
		draggable: true,
		atom: true,
		content: 'inline*',
		isolating: true,

		addNodeView() {
			return SvelteNodeViewRenderer(component)
		},
		addCommands() {
			return {
				insertGalleryPlaceholder: () => (props: CommandProps) => {
					return props.commands.insertContent({
						type: 'gallery-placeholder'
					})
				}
			}
		}
	})
