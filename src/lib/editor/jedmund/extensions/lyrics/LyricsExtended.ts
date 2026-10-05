import { Node, mergeAttributes, type CommandProps, type NodeViewProps } from '@tiptap/core'
import type { Component } from 'svelte'
import { SvelteNodeViewRenderer } from '$lib/components/edra/tiptap/index.js'
import {
	LYRICS_DEFAULTS,
	normalizeStanzas,
	type LyricsAttributes
} from '$lib/utils/content/lyrics.js'

export interface LyricsOptions {
	HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		lyrics: {
			/**
			 * Inserts a bilingual lyrics block
			 */
			insertLyrics: (attrs?: Partial<LyricsAttributes>) => ReturnType
		}
	}
}

const textAttribute = (name: string, fallback: string | null) => ({
	default: fallback,
	parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}`) ?? fallback,
	renderHTML: (attributes: Record<string, unknown>) =>
		attributes[name] ? { [`data-${name}`]: attributes[name] } : {}
})

export const LyricsExtended = (component: Component<NodeViewProps>): Node<LyricsOptions> =>
	Node.create<LyricsOptions>({
		name: 'lyrics',
		group: 'block',
		atom: true,
		// ProseMirror marks draggable leaf views `draggable="true"`, which stops Firefox/Safari from
		// placing the caret in the textareas. The side drag handle still moves the block.
		draggable: false,

		addOptions() {
			return { HTMLAttributes: {} }
		},

		addStorage() {
			return { autoFocus: false }
		},

		addAttributes() {
			return {
				langA: textAttribute('langA', LYRICS_DEFAULTS.langA),
				langB: textAttribute('langB', LYRICS_DEFAULTS.langB),
				titleA: textAttribute('titleA', null),
				titleB: textAttribute('titleB', null),
				artistA: textAttribute('artistA', null),
				artistB: textAttribute('artistB', null),
				stanzas: {
					default: [],
					parseHTML: (element) => {
						try {
							return normalizeStanzas(JSON.parse(element.getAttribute('data-stanzas') ?? '[]'))
						} catch {
							return []
						}
					},
					renderHTML: (attributes) => ({ 'data-stanzas': JSON.stringify(attributes.stanzas) })
				}
			}
		},

		parseHTML() {
			return [{ tag: `div[data-type="${this.name}"]` }]
		},

		renderHTML({ HTMLAttributes }) {
			return [
				'div',
				mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': this.name })
			]
		},

		addNodeView() {
			return SvelteNodeViewRenderer(component)
		},

		addCommands() {
			return {
				insertLyrics:
					(attrs = {}) =>
					(props: CommandProps) => {
						this.storage.autoFocus = true
						return props.commands.insertContent({
							type: this.name,
							attrs: { ...LYRICS_DEFAULTS, stanzas: [{ a: '', b: '' }], ...attrs }
						})
					}
			}
		}
	})
