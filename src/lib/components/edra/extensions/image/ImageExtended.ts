import type { Node, NodeViewProps } from '@tiptap/core';
import Image, { type ImageOptions } from '@tiptap/extension-image';
import type { Component } from 'svelte';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';

export const ImageExtended = (component: Component<NodeViewProps>): Node<ImageOptions, unknown> => {
	return Image.extend({
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
				},
				mediaId: {
					default: null,
					parseHTML: (element) => element.getAttribute('data-media-id'),
					renderHTML: (attributes) => {
						if (!attributes.mediaId) {
							return {};
						}
						return {
							'data-media-id': attributes.mediaId
						};
					}
				}
			};
		},
		addNodeView: () => {
			return SvelteNodeViewRenderer(component);
		}
	}).configure({
		allowBase64: true
	});
};
