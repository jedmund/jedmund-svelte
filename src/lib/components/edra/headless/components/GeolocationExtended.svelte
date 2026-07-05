<script lang="ts">
	import { type NodeViewProps } from '@tiptap/core'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import { onMount } from 'svelte'
	import { mount, unmount } from 'svelte'
	import type L from 'leaflet'
	import tippy, { type Instance } from 'tippy.js'
	import 'tippy.js/dist/tippy.css'
	import Edit from '@lucide/svelte/icons/edit'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import Trash from '@lucide/svelte/icons/trash'
	import MapPopup from './MapPopup.svelte'
	import { duplicateContent } from '../../utils.js'

	type Props = NodeViewProps
	let { node, editor, selected, deleteNode, getPos }: Props = $props()

	let mapContainer: HTMLDivElement
	let map: L.Map | null = null
	let leaflet: typeof L

	// Hover toolbar (same pattern as MediaExtended/GalleryExtended)
	let groupRef = $state<HTMLElement>()
	let toolbarRef = $state<HTMLElement>()
	let tippyInstance: Instance | undefined

	$effect(() => {
		if (!groupRef || !toolbarRef || !editor?.isEditable) {
			tippyInstance?.destroy()
			tippyInstance = undefined
			return
		}

		tippyInstance = tippy(groupRef, {
			content: toolbarRef,
			interactive: true,
			trigger: 'mouseenter',
			placement: 'top-end',
			appendTo: () => document.body,
			arrow: false,
			theme: 'media-toolbar',
			delay: [100, 300],
			offset: [0, 8],
			interactiveBorder: 20,
			zIndex: 200,
			popperOptions: {
				modifiers: [
					{
						name: 'preventOverflow',
						options: { boundary: 'viewport', padding: 8 }
					},
					{
						name: 'flip',
						options: {
							fallbackPlacements: ['bottom-end', 'top-start', 'bottom-start']
						}
					}
				]
			}
		})

		return () => {
			tippyInstance?.destroy()
			tippyInstance = undefined
		}
	})

	$effect(() => {
		if (selected && tippyInstance) tippyInstance.show()
	})

	// Swap the node back to a placeholder so the location picker reopens
	function changeLocation() {
		const pos = getPos?.()
		if (typeof pos !== 'number') return
		editor
			.chain()
			.focus()
			.deleteRange({ from: pos, to: pos + node.nodeSize })
			.insertContentAt(pos, { type: 'geolocation-placeholder' })
			.run()
	}

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
		let popupComponent: ReturnType<typeof mount> | null = null
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

		return () => {
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
			<div bind:this={toolbarRef} class="edra-media-toolbar">
				<button class="edra-toolbar-button" onclick={changeLocation} title="Change location">
					<Edit size={16} strokeWidth={2} />
				</button>
				<button
					class="edra-toolbar-button"
					onclick={() => duplicateContent(editor, node)}
					title="Duplicate"
				>
					<CopyIcon size={16} strokeWidth={2} />
				</button>
				<div class="edra-toolbar-divider"></div>
				<button
					class="edra-toolbar-button edra-destructive"
					onclick={() => deleteNode()}
					title="Delete"
				>
					<Trash size={16} strokeWidth={2} />
				</button>
			</div>
		{/if}
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
