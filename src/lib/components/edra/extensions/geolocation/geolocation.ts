import { Node, mergeAttributes } from '@tiptap/core'
import { SvelteNodeViewRenderer } from 'svelte-tiptap'
import GeolocationPlaceholder from './geolocation-placeholder.svelte'
import GeolocationExtended from './geolocation-extended.svelte'

export interface GeolocationOptions {
	HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		geolocation: {
			/**
			 * Set a geolocation node
			 */
			setGeolocation: (options: {
				latitude: number
				longitude: number
				title?: string
				description?: string
				markerColor?: string
				zoom?: number
			}) => ReturnType
		}
	}
}

export const Geolocation = Node.create<GeolocationOptions>({
	name: 'geolocation',

	group: 'block',

	atom: true,

	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {}
		}
	},

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
				renderHTML: (attributes) => {
					if (!attributes.title) return {}
					return { 'data-title': attributes.title }
				}
			},
			description: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-description'),
				renderHTML: (attributes) => {
					if (!attributes.description) return {}
					return { 'data-description': attributes.description }
				}
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
		return [
			{
				tag: 'div[data-type="geolocation"]'
			}
		]
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'geolocation' })]
	},

	addNodeView() {
		return SvelteNodeViewRenderer(GeolocationExtended, {
			placeholder: GeolocationPlaceholder
		})
	},

	addCommands() {
		return {
			setGeolocation:
				(options) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: options
					})
				}
		}
	}
})
