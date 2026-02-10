import type { NodeViewProps } from '@tiptap/core';
import type { Component } from 'svelte';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import { Audio } from './AudioExtension.js';

export const AudioExtended = (
	content: Component<NodeViewProps>,
	onDrop?: (file: File) => Promise<string>
) =>
	Audio(onDrop).extend({
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
				},
				waveformData: {
					default: null,
					parseHTML: (element) => {
						const data = element.getAttribute('data-waveform');
						return data ? JSON.parse(data) : null;
					},
					renderHTML: (attributes) => {
						if (!attributes.waveformData) {
							return {};
						}
						return {
							'data-waveform': JSON.stringify(attributes.waveformData)
						};
					}
				}
			};
		},

		addNodeView: () => {
			return SvelteNodeViewRenderer(content);
		}
	});
