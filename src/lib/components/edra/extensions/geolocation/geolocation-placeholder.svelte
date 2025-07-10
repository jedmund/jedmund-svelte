<script lang="ts">
	import { getContext } from 'svelte'
	import type { Readable } from 'svelte/store'
	import type { Editor } from '@tiptap/core'
	import Button from '$lib/components/admin/Button.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import Textarea from '$lib/components/admin/Textarea.svelte'

	const editor = getContext<Readable<Editor>>('editor')

	let showForm = $state(false)
	let title = $state('')
	let description = $state('')
	let latitude = $state('')
	let longitude = $state('')
	let markerColor = $state('#ef4444')
	let zoom = $state(15)

	// Map picker state
	let showMapPicker = $state(false)
	let mapContainer: HTMLDivElement
	let pickerMap: any
	let pickerMarker: any
	let leaflet: any

	// Load Leaflet for map picker
	async function loadLeaflet() {
		if (typeof window === 'undefined') return
		if (window.L) {
			leaflet = window.L
			return
		}

		// Load CSS
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
		document.head.appendChild(link)

		// Load JS
		const script = document.createElement('script')
		script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

		await new Promise((resolve, reject) => {
			script.onload = resolve
			script.onerror = reject
			document.head.appendChild(script)
		})

		leaflet = window.L
	}

	// Initialize map picker
	async function initMapPicker() {
		if (!mapContainer || !leaflet) return

		// Default to San Francisco if no coordinates
		const lat = latitude ? parseFloat(latitude) : 37.7749
		const lng = longitude ? parseFloat(longitude) : -122.4194

		pickerMap = leaflet.map(mapContainer, {
			center: [lat, lng],
			zoom: zoom
		})

		leaflet
			.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors'
			})
			.addTo(pickerMap)

		// Add marker
		pickerMarker = leaflet
			.marker([lat, lng], {
				draggable: true
			})
			.addTo(pickerMap)

		// Update coordinates on marker drag
		pickerMarker.on('dragend', (e: any) => {
			const position = e.target.getLatLng()
			latitude = position.lat.toFixed(6)
			longitude = position.lng.toFixed(6)
		})

		// Update marker on map click
		pickerMap.on('click', (e: any) => {
			pickerMarker.setLatLng(e.latlng)
			latitude = e.latlng.lat.toFixed(6)
			longitude = e.latlng.lng.toFixed(6)
		})

		// Update zoom on change
		pickerMap.on('zoomend', () => {
			zoom = pickerMap.getZoom()
		})
	}

	// Open map picker
	async function openMapPicker() {
		showMapPicker = true
		await loadLeaflet()
		// Wait for DOM update
		setTimeout(() => {
			initMapPicker()
		}, 100)
	}

	// Close map picker
	function closeMapPicker() {
		if (pickerMap) {
			pickerMap.remove()
			pickerMap = null
		}
		pickerMarker = null
		showMapPicker = false
	}

	function handleInsert() {
		const lat = parseFloat(latitude)
		const lng = parseFloat(longitude)

		if (isNaN(lat) || isNaN(lng)) {
			alert('Please enter valid coordinates')
			return
		}

		$editor
			.chain()
			.focus()
			.setGeolocation({
				latitude: lat,
				longitude: lng,
				title: title || undefined,
				description: description || undefined,
				markerColor,
				zoom
			})
			.run()
	}

	function handleQuickLocation(lat: number, lng: number, name: string) {
		$editor
			.chain()
			.focus()
			.setGeolocation({
				latitude: lat,
				longitude: lng,
				title: name,
				zoom: 13
			})
			.run()
	}
</script>

<div class="geolocation-placeholder">
	{#if !showForm}
		<div class="placeholder-content">
			<div class="icon">📍</div>
			<p class="label">Add a location</p>
			<div class="actions">
				<Button variant="secondary" buttonSize="small" onclick={() => (showForm = true)}>
					Custom Location
				</Button>
				<div class="quick-locations">
					<button
						class="quick-location"
						onclick={() => handleQuickLocation(37.7749, -122.4194, 'San Francisco')}
					>
						San Francisco
					</button>
					<button
						class="quick-location"
						onclick={() => handleQuickLocation(40.7128, -74.006, 'New York')}
					>
						New York
					</button>
					<button
						class="quick-location"
						onclick={() => handleQuickLocation(51.5074, -0.1278, 'London')}
					>
						London
					</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="form-content">
			<h3>Add Location</h3>

			<div class="form-fields">
				<Input label="Title (optional)" bind:value={title} placeholder="Location name" />

				<Textarea
					label="Description (optional)"
					bind:value={description}
					placeholder="About this location"
					rows={2}
				/>

				<div class="coordinates-row">
					<Input
						label="Latitude"
						bind:value={latitude}
						placeholder="37.7749"
						type="number"
						step="0.000001"
						required
					/>
					<Input
						label="Longitude"
						bind:value={longitude}
						placeholder="-122.4194"
						type="number"
						step="0.000001"
						required
					/>
					<Button variant="secondary" onclick={openMapPicker} buttonSize="small">📍 Pick</Button>
				</div>

				<div class="options-row">
					<label class="color-label">
						Marker Color
						<input type="color" bind:value={markerColor} class="color-input" />
					</label>
					<label class="zoom-label">
						Zoom Level
						<input type="range" bind:value={zoom} min="1" max="20" class="zoom-input" />
						<span>{zoom}</span>
					</label>
				</div>
			</div>

			{#if showMapPicker}
				<div class="map-picker-modal">
					<div class="map-picker-content">
						<div class="map-picker-header">
							<h4>Click to set location</h4>
							<Button variant="ghost" buttonSize="small" onclick={closeMapPicker}>Close</Button>
						</div>
						<div bind:this={mapContainer} class="map-picker-container"></div>
					</div>
				</div>
			{/if}

			<div class="form-actions">
				<Button variant="ghost" onclick={() => (showForm = false)}>Cancel</Button>
				<Button variant="primary" onclick={handleInsert} disabled={!latitude || !longitude}>
					Insert Location
				</Button>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.geolocation-placeholder {
		margin: $unit-2x 0;
		background: $gray-95;
		border: 2px dashed $gray-80;
		border-radius: $corner-radius-md;
		overflow: hidden;
	}

	.placeholder-content {
		padding: $unit-3x;
		text-align: center;

		.icon {
			font-size: 2rem;
			margin-bottom: $unit;
		}

		.label {
			margin: 0 0 $unit-2x;
			color: $gray-40;
			font-size: 0.875rem;
		}

		.actions {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: $unit;
		}

		.quick-locations {
			display: flex;
			gap: $unit-half;
			flex-wrap: wrap;
			justify-content: center;
			margin-top: $unit;
		}

		.quick-location {
			padding: 4px 12px;
			background: white;
			border: 1px solid $gray-80;
			border-radius: $corner-radius-sm;
			font-size: 0.75rem;
			color: $gray-30;
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover {
				border-color: $gray-60;
				color: $gray-10;
			}
		}
	}

	.form-content {
		padding: $unit-3x;

		h3 {
			margin: 0 0 $unit-3x;
			font-size: 1rem;
			font-weight: 600;
			color: $gray-10;
		}
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		margin-bottom: $unit-3x;
	}

	.coordinates-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: $unit;
		align-items: flex-end;
	}

	.options-row {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: $unit-3x;
		align-items: center;
	}

	.color-label,
	.zoom-label {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: 0.875rem;
		font-weight: 500;
		color: $gray-20;
	}

	.color-input {
		width: 40px;
		height: 24px;
		padding: 0;
		border: 1px solid $gray-80;
		border-radius: $corner-radius-sm;
		cursor: pointer;
	}

	.zoom-input {
		width: 100px;
	}

	.zoom-label span {
		min-width: 24px;
		text-align: right;
		font-family: 'SF Mono', Monaco, monospace;
		font-size: 0.75rem;
		color: $gray-40;
	}

	.map-picker-modal {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		padding: $unit-3x;
	}

	.map-picker-content {
		background: white;
		border-radius: $corner-radius-md;
		width: 90%;
		max-width: 800px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
	}

	.map-picker-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit-2x $unit-3x;
		border-bottom: 1px solid $gray-90;

		h4 {
			margin: 0;
			font-size: 1rem;
			font-weight: 600;
			color: $gray-10;
		}
	}

	.map-picker-container {
		height: 500px;
		width: 100%;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: $unit;
	}
</style>
