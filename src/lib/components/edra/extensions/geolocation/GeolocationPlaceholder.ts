import { Node, mergeAttributes, type CommandProps, type NodeViewProps } from '@tiptap/core'
import type { Component } from 'svelte'
import { SvelteNodeViewRenderer } from 'svelte-tiptap'

export interface GeolocationPlaceholderOptions {
	HTMLAttributes: Record<string, object>
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		geolocationPlaceholder: {
			/**
			 * Inserts a geolocation placeholder
			 */
			insertGeolocationPlaceholder: () => ReturnType
		}
	}
}

export const GeolocationPlaceholder = (
	component: Component<NodeViewProps>
): Node<GeolocationPlaceholderOptions> =>
	Node.create<GeolocationPlaceholderOptions>({
		name: 'geolocation-placeholder',
		addOptions() {
			return {
				HTMLAttributes: {}
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
				insertGeolocationPlaceholder: () => (props: CommandProps) => {
					return props.commands.insertContent({
						type: 'geolocation-placeholder'
					})
				}
			}
		}
	})
