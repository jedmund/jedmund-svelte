<script lang="ts">
	import { type NodeViewProps } from '@tiptap/core'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import { onMount } from 'svelte'
	import type L from 'leaflet'

	interface Props extends NodeViewProps {}
	let { node, selected }: Props = $props()

	let mapContainer: HTMLDivElement
	let map: L.Map | null = null
	let leaflet: typeof L

	const latitude = node.attrs.latitude as number
	const longitude = node.attrs.longitude as number
	const title = node.attrs.title as string
	const description = node.attrs.description as string
	const markerColor = node.attrs.markerColor as string
	const zoom = (node.attrs.zoom as number) || 15

	onMount(async () => {
		// Dynamically import Leaflet
		leaflet = (await import('leaflet')).default
		await import('leaflet/dist/leaflet.css')

		// Initialize map
		map = leaflet.map(mapContainer).setView([latitude, longitude], zoom)

		// Add tile layer
		leaflet
			.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors'
			})
			.addTo(map)

		// Create custom icon with color
		const icon = leaflet.divIcon({
			html: `<div style="background-color: ${markerColor}; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
			iconSize: [25, 25],
			iconAnchor: [12, 25],
			popupAnchor: [0, -25],
			className: 'custom-marker'
		})

		// Add marker
		const marker = leaflet.marker([latitude, longitude], { icon }).addTo(map)

		// Add popup if title or description exists
		if (title || description) {
			const popupContent = `
				<div class="map-popup">
					${title ? `<h4>${title}</h4>` : ''}
					${description ? `<p>${description}</p>` : ''}
				</div>
			`
			marker.bindPopup(popupContent)
		}

		return () => {
			map?.remove()
		}
	})
</script>

<NodeViewWrapper>
	<div class="geolocation-node" class:selected>
		<div bind:this={mapContainer} class="map-container"></div>
	</div>
</NodeViewWrapper>

<style lang="scss">
	:global(.leaflet-container) {
		font-family: inherit;
	}

	:global(.custom-marker) {
		background: transparent;
		border: none;
	}

	:global(.map-popup) {
		h4 {
			margin: 0 0 8px;
			font-size: 16px;
			font-weight: 600;
		}

		p {
			margin: 0;
			font-size: 14px;
			color: #4b5563;
		}
	}

	.geolocation-node {
		margin: 16px 0;
		border-radius: 8px;
		overflow: hidden;
		border: 2px solid transparent;
		transition: border-color 0.2s;

		&.selected {
			border-color: #3b82f6;
		}
	}

	.map-container {
		width: 100%;
		height: 400px;
		background: #f3f4f6;
	}
</style>
