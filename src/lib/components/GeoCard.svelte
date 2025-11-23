<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import type { GeoLocation } from '@prisma/client'

	interface Props {
		location: GeoLocation
		height?: number
		interactive?: boolean
		showPopup?: boolean
		class?: string
	}

	let {
		location,
		height = 400,
		interactive = true,
		showPopup = true,
		class: className = ''
	}: Props = $props()

	let mapContainer: HTMLDivElement
	let map: L.Map | null = null
	let marker: L.Marker | null = null
	let leaflet: typeof L | null = null

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
		if (!mapContainer || !leaflet) return

		// Create map
		map = leaflet.map(mapContainer, {
			center: [location.latitude, location.longitude],
			zoom: 15,
			scrollWheelZoom: interactive,
			dragging: interactive,
			touchZoom: interactive,
			doubleClickZoom: interactive,
			boxZoom: interactive,
			keyboard: interactive,
			zoomControl: interactive
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
		if (location.markerColor) {
			const markerIcon = leaflet.divIcon({
				className: 'custom-marker',
				html: `<div style="background-color: ${location.markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
				iconSize: [30, 30],
				iconAnchor: [15, 15],
				popupAnchor: [0, -15]
			})
			markerOptions = { icon: markerIcon }
		}

		// Add marker
		marker = leaflet.marker([location.latitude, location.longitude], markerOptions).addTo(map)

		// Add popup if enabled
		if (showPopup && (location.title || location.description)) {
			const popupContent = `
				<div class="location-popup">
					${location.title ? `<h3>${location.title}</h3>` : ''}
					${location.description ? `<p>${location.description}</p>` : ''}
				</div>
			`
			marker.bindPopup(popupContent, {
				autoPan: true,
				keepInView: true
			})

			// Open popup by default on non-interactive maps
			if (!interactive) {
				marker.openPopup()
			}
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

	// Reinitialize if location changes
	$effect(() => {
		if (map && location) {
			cleanup()
			initMap()
		}
	})
</script>

<div class="geo-card {className}">
	<div
		bind:this={mapContainer}
		class="map-container"
		style="height: {height}px"
		role="img"
		aria-label="Map showing {location.title ||
			'location'} at coordinates {location.latitude}, {location.longitude}"
	>
		<noscript>
			<div class="map-fallback">
				<div class="fallback-content">
					<h3>{location.title}</h3>
					{#if location.description}
						<p>{location.description}</p>
					{/if}
					<p class="coordinates">
						{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
					</p>
					<a
						href="https://www.openstreetmap.org/?mlat={location.latitude}&mlon={location.longitude}#map=15/{location.latitude}/{location.longitude}"
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
	@import '$styles/mixins.scss';

	.geo-card {
		width: 100%;
		border-radius: $image-corner-radius;
		overflow: hidden;
		box-shadow: 0 2px 8px $shadow-light;
	}

	.map-container {
		width: 100%;
		position: relative;
		background: $gray-95;

		:global(.leaflet-container) {
			font-family: inherit;
		}

		:global(.location-popup h3) {
			margin: 0 0 $unit-half;
			font-size: 1rem;
			font-weight: 600;
			color: $gray-10;
		}

		:global(.location-popup p) {
			margin: 0;
			font-size: 0.875rem;
			color: $gray-30;
			line-height: 1.4;
		}

		:global(.leaflet-popup-content-wrapper) {
			border-radius: $corner-radius-md;
			box-shadow: 0 2px 8px $shadow-medium;
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
		background: $gray-95;
		padding: $unit-3x;
		text-align: center;
	}

	.fallback-content {
		h3 {
			margin: 0 0 $unit;
			font-size: 1.25rem;
			color: $gray-10;
		}

		p {
			margin: 0 0 $unit;
			color: $gray-40;
			line-height: 1.5;
		}

		.coordinates {
			font-family: 'SF Mono', Monaco, monospace;
			font-size: 0.875rem;
			color: $gray-60;
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
	/* Global styles for Leaflet */
	:global(.leaflet-control-attribution) {
		font-size: 0.75rem;
		background: $overlay-light !important;
	}
</style>
