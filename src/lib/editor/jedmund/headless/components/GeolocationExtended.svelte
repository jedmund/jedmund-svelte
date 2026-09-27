<script lang="ts">
	import { type NodeViewProps } from '@tiptap/core'
	import { NodeViewWrapper } from '$lib/components/edra/tiptap/index.js'
	import { onMount } from 'svelte'
	import ContentInsertionPane from './ContentInsertionPane.svelte'
	import type { LocationAttributes } from '../../extensions/geolocation/GeolocationExtended.js'
	import { mount, unmount } from 'svelte'
	import type L from 'leaflet'
	import NodeToolbar from './NodeToolbar.svelte'
	import Edit from '@lucide/svelte/icons/edit'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import Trash from '@lucide/svelte/icons/trash'
	import MapPopup from './MapPopup.svelte'
	import { duplicateNode } from '../../node-actions.js'

	type Props = NodeViewProps
	let { node, editor, selected, deleteNode, getPos }: Props = $props()

	let mapContainer: HTMLDivElement
	let map: L.Map | null = null
	let leaflet: typeof L

	// Hover toolbar (same pattern as MediaExtended/GalleryExtended)
	let groupRef = $state<HTMLElement>()

	let editing = $state(false)
	let panePosition = $state({ x: 0, y: 0 })
	function changeLocation() {
		const rect = groupRef?.getBoundingClientRect()
		if (!rect) return
		panePosition = { x: rect.left, y: rect.top }
		editing = true
	}
	function updateLocation(location: LocationAttributes) {
		const pos = getPos()
		if (typeof pos !== 'number') return
		// Replace at the node's live position, so cancel never removes the existing map.
		editor
			.chain()
			.insertContentAt(
				{ from: pos, to: pos + node.nodeSize },
				{ type: 'geolocation', attrs: { ...node.attrs, ...location } }
			)
			.focus()
			.run()
	}

	let mounted = $state(false)
	onMount(() => {
		mounted = true
	})
	$effect(() => {
		if (!mounted) return
		const { latitude, longitude, title, description, markerColor, zoom } =
			node.attrs as LocationAttributes
		let disposed = false
		let popupComponent: ReturnType<typeof mount> | null = null

		const initialize = async () => {
			// Dynamically import Leaflet
			leaflet = (await import('leaflet')).default
			await import('leaflet/dist/leaflet.css')
			if (disposed) return

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
				// Create a container for the Svelte component
				const popupContainer = document.createElement('div')

				// Mount the Svelte component
				popupComponent = mount(MapPopup, {
					target: popupContainer,
					props: { title, description }
				})

				// Bind the container to the marker
				marker.bindPopup(popupContainer)
			}
		}

		void initialize()

		return () => {
			disposed = true
			// Clean up the popup component
			if (popupComponent) {
				unmount(popupComponent)
			}
			map?.remove()
		}
	})
</script>

<NodeViewWrapper>
	<div bind:this={groupRef} class="geolocation-node" class:selected>
		<div bind:this={mapContainer} class="map-container"></div>

		{#if editor?.isEditable}
			<NodeToolbar anchor={groupRef} {selected}>
				<button
					type="button"
					class="edra-toolbar-button"
					onclick={changeLocation}
					title="Change location"
				>
					<Edit size={16} strokeWidth={2} />
				</button>
				<button
					type="button"
					class="edra-toolbar-button"
					onclick={() => duplicateNode(editor, node, getPos)}
					title="Duplicate"
				>
					<CopyIcon size={16} strokeWidth={2} />
				</button>
				<div class="edra-toolbar-divider"></div>
				<button
					type="button"
					class="edra-toolbar-button edra-destructive"
					onclick={() => deleteNode()}
					title="Delete"
				>
					<Trash size={16} strokeWidth={2} />
				</button>
			</NodeToolbar>
		{/if}
	</div>
	{#if editing}
		<ContentInsertionPane
			{editor}
			position={panePosition}
			contentType="location"
			initialLocation={node.attrs as LocationAttributes}
			onLocationSelect={updateLocation}
			onClose={() => (editing = false)}
		/>
	{/if}
</NodeViewWrapper>

<style lang="scss">
	:global(.leaflet-container) {
		font-family: inherit;
	}

	:global(.custom-marker) {
		background: transparent;
		border: none;
	}

	.geolocation-node {
		margin: 16px 0;
		border-radius: var(--corner-radius);
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
