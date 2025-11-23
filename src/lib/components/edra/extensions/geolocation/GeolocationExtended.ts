import { Node, mergeAttributes, type NodeViewProps } from '@tiptap/core'
import type { Component } from 'svelte'
import { SvelteNodeViewRenderer } from 'svelte-tiptap'

export interface GeolocationExtendedOptions {
	HTMLAttributes: Record<string, unknown>
}

export const GeolocationExtended = (
	component: Component<NodeViewProps>
): Node<GeolocationExtendedOptions> =>
	Node.create<GeolocationExtendedOptions>({
		name: 'geolocation',
		addOptions() {
			return {
				HTMLAttributes: {}
			}
		},
		group: 'block',
		atom: true,
		draggable: true,
		addAttributes() {
			return {
				latitude: {
					default: null,
					parseHTML: (element) => parseFloat(element.getAttribute('data-latitude') || '0'),
					renderHTML: (attributes) => ({
						'data-latitude': attributes.latitude
					})
				},
				longitude: {
					default: null,
					parseHTML: (element) => parseFloat(element.getAttribute('data-longitude') || '0'),
					renderHTML: (attributes) => ({
						'data-longitude': attributes.longitude
					})
				},
				title: {
					default: null,
					parseHTML: (element) => element.getAttribute('data-title'),
					renderHTML: (attributes) => ({
						'data-title': attributes.title
					})
				},
				description: {
					default: null,
					parseHTML: (element) => element.getAttribute('data-description'),
					renderHTML: (attributes) => ({
						'data-description': attributes.description
					})
				},
				markerColor: {
					default: '#ef4444',
					parseHTML: (element) => element.getAttribute('data-marker-color') || '#ef4444',
					renderHTML: (attributes) => ({
						'data-marker-color': attributes.markerColor
					})
				},
				zoom: {
					default: 15,
					parseHTML: (element) => parseInt(element.getAttribute('data-zoom') || '15'),
					renderHTML: (attributes) => ({
						'data-zoom': attributes.zoom
					})
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
		}
	})
