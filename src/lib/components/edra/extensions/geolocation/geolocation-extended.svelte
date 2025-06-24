<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import type { NodeViewProps } from '@tiptap/core'

	interface Props extends NodeViewProps {}

	let { node, updateAttributes }: Props = $props()

	let mapContainer: HTMLDivElement
	let map: any
	let marker: any
	let leaflet: any
	let isEditing = $state(false)

	// Extract attributes
	const latitude = $derived(node.attrs.latitude)
	const longitude = $derived(node.attrs.longitude)
	const title = $derived(node.attrs.title)
	const description = $derived(node.attrs.description)
	const markerColor = $derived(node.attrs.markerColor || '#ef4444')
	const zoom = $derived(node.attrs.zoom || 15)

	// Load Leaflet dynamically
	async function loadLeaflet() {
		if (typeof window === 'undefined') return

		// Check if already loaded
		if (window.L) {
			leaflet = window.L
			return
		}

		// Load Leaflet CSS
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
		link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
		link.crossOrigin = ''
		document.head.appendChild(link)

		// Load Leaflet JS
		const script = document.createElement('script')
		script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
		script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
		script.crossOrigin = ''

		await new Promise((resolve, reject) => {
			script.onload = resolve
			script.onerror = reject
			document.head.appendChild(script)
		})

		leaflet = window.L
	}

	// Initialize map
	async function initMap() {
		if (!mapContainer || !leaflet || !latitude || !longitude) return

		// Create map
		map = leaflet.map(mapContainer, {
			center: [latitude, longitude],
			zoom: zoom,
			scrollWheelZoom: false, // Disabled by default in editor
			dragging: !isEditing,
			touchZoom: !isEditing,
			doubleClickZoom: !isEditing,
			boxZoom: false,
			keyboard: false,
			zoomControl: true
		})

		// Add tile layer (using OpenStreetMap)
		leaflet
			.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution:
					'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 19
			})
			.addTo(map)

		// Create custom marker icon if color is specified
		let markerOptions = {}
		if (markerColor) {
			const markerIcon = leaflet.divIcon({
				className: 'custom-marker',
				html: `<div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
				iconSize: [30, 30],
				iconAnchor: [15, 15],
				popupAnchor: [0, -15]
			})
			markerOptions = { icon: markerIcon }
		}

		// Add marker
		marker = leaflet.marker([latitude, longitude], markerOptions).addTo(map)

		// Add popup if title or description exists
		if (title || description) {
			const popupContent = `
				<div class="location-popup">
					${title ? `<h3>${title}</h3>` : ''}
					${description ? `<p>${description}</p>` : ''}
				</div>
			`
			marker.bindPopup(popupContent, {
				autoPan: true,
				keepInView: true
			})
		}
	}

	// Cleanup
	function cleanup() {
		if (map) {
			map.remove()
			map = null
		}
		marker = null
	}

	// Handle edit mode
	function toggleEdit() {
		isEditing = !isEditing
		if (map) {
			map.dragging[isEditing ? 'disable' : 'enable']()
			map.touchZoom[isEditing ? 'disable' : 'enable']()
			map.doubleClickZoom[isEditing ? 'disable' : 'enable']()
			map.scrollWheelZoom[isEditing ? 'disable' : 'enable']()
		}
	}

	onMount(async () => {
		try {
			await loadLeaflet()
			await initMap()
		} catch (error) {
			console.error('Failed to load map:', error)
		}
	})

	onDestroy(() => {
		cleanup()
	})

	// Reinitialize if attributes change
	$effect(() => {
		if (map && (latitude || longitude)) {
			cleanup()
			initMap()
		}
	})
</script>

<div class="geolocation-node" data-drag-handle>
	<div class="geolocation-header">
		<div class="header-info">
			<span class="icon">📍</span>
			{#if title}
				<span class="title">{title}</span>
			{:else}
				<span class="coordinates">{latitude?.toFixed(4)}, {longitude?.toFixed(4)}</span>
			{/if}
		</div>
		<div class="header-actions">
			<button
				class="action-button"
				onclick={toggleEdit}
				title={isEditing ? 'Enable map interaction' : 'Disable map interaction'}
			>
				{isEditing ? '🔒' : '🔓'}
			</button>
		</div>
	</div>

	<div
		bind:this={mapContainer}
		class="map-container"
		class:editing={isEditing}
		role="img"
		aria-label="Map showing {title || 'location'} at coordinates {latitude}, {longitude}"
	>
		<noscript>
			<div class="map-fallback">
				<div class="fallback-content">
					{#if title}
						<h3>{title}</h3>
					{/if}
					{#if description}
						<p>{description}</p>
					{/if}
					<p class="coordinates">
						{latitude?.toFixed(6)}, {longitude?.toFixed(6)}
					</p>
					<a
						href="https://www.openstreetmap.org/?mlat={latitude}&mlon={longitude}#map={zoom}/{latitude}/{longitude}"
						target="_blank"
						rel="noopener noreferrer"
					>
						View on OpenStreetMap
					</a>
				</div>
			</div>
		</noscript>
	</div>
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.geolocation-node {
		margin: $unit-2x 0;
		border: 1px solid $grey-90;
		border-radius: $corner-radius-md;
		overflow: hidden;
		background: white;
	}

	.geolocation-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit $unit-2x;
		background: $grey-95;
		border-bottom: 1px solid $grey-90;
		font-size: 0.875rem;
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: $unit;

		.icon {
			font-size: 1rem;
		}

		.title {
			font-weight: 500;
			color: $grey-10;
		}

		.coordinates {
			font-family: 'SF Mono', Monaco, monospace;
			color: $grey-40;
			font-size: 0.75rem;
		}
	}

	.action-button {
		padding: 4px 8px;
		background: transparent;
		border: 1px solid $grey-80;
		border-radius: $corner-radius-sm;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s ease;

		&:hover {
			background: white;
			border-color: $grey-60;
		}
	}

	.map-container {
		height: 400px;
		width: 100%;
		position: relative;
		background: $grey-95;

		&.editing {
			opacity: 0.8;
			pointer-events: none;
		}

		:global(.leaflet-container) {
			font-family: inherit;
		}

		:global(.location-popup) {
			h3 {
				margin: 0 0 $unit-half;
				font-size: 1rem;
				font-weight: 600;
				color: $grey-10;
			}

			p {
				margin: 0;
				font-size: 0.875rem;
				color: $grey-30;
				line-height: 1.4;
			}
		}

		:global(.leaflet-popup-content-wrapper) {
			border-radius: $corner-radius-md;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		}

		:global(.leaflet-popup-content) {
			margin: $unit-2x;
		}
	}

	.map-fallback {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: $grey-95;
		padding: $unit-3x;
		text-align: center;
	}

	.fallback-content {
		h3 {
			margin: 0 0 $unit;
			font-size: 1.25rem;
			color: $grey-10;
		}

		p {
			margin: 0 0 $unit;
			color: $grey-40;
			line-height: 1.5;
		}

		.coordinates {
			font-family: 'SF Mono', Monaco, monospace;
			font-size: 0.875rem;
			color: $grey-60;
			margin-bottom: $unit-2x;
		}

		a {
			color: $red-60;
			text-decoration: none;
			font-weight: 500;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	/* Ensure Leaflet attribution is styled properly */
	:global(.leaflet-control-attribution) {
		font-size: 0.75rem;
		background: rgba(255, 255, 255, 0.9) !important;
	}
</style>
