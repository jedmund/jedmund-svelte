import type { NodeViewProps } from '@tiptap/core'
import type { Component } from 'svelte'
import { SvelteNodeViewRenderer } from '$lib/components/edra/tiptap/index.js'
import IFrame from './IFrame.js'

export const IFrameExtended = (content: Component<any>) =>
	IFrame.extend({
		addAttributes() {
			return {
				src: {
					default: null
				},
				alt: {
					default: null
				},
				title: {
					default: null
				},
				width: {
					default: '100%'
				},
				height: {
					default: null
				},
				align: {
					default: 'left'
				}
			}
		},

		addNodeView: () => {
			return SvelteNodeViewRenderer(content)
		}
	})
