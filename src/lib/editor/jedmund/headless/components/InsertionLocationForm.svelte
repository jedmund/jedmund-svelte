<script lang="ts">
	let {
		locationTitle = $bindable(),
		locationDescription = $bindable(),
		locationLat = $bindable(),
		locationLng = $bindable(),
		locationMarkerColor = $bindable(),
		locationZoom = $bindable(),
		onLocationSelect,
		handleLocationInsert
	}: {
		locationTitle: string
		locationDescription: string
		locationLat: string | number
		locationLng: string | number
		locationMarkerColor: string
		locationZoom: number
		onLocationSelect: boolean
		handleLocationInsert: () => void
	} = $props()
</script>

<div class="location-form">
	<div class="form-group">
		<label for="location-title" class="form-label">Title (optional)</label>
		<input
			id="location-title"
			bind:value={locationTitle}
			placeholder="Location name"
			class="form-input"
		/>
	</div>

	<div class="form-group">
		<label for="location-description" class="form-label">Description (optional)</label>
		<textarea
			id="location-description"
			bind:value={locationDescription}
			placeholder="About this location"
			class="form-textarea"
			rows="2"
		></textarea>
	</div>

	<div class="coordinates-group">
		<div class="form-group">
			<label for="location-lat" class="form-label">Latitude <span class="required">*</span></label>
			<input
				id="location-lat"
				bind:value={locationLat}
				placeholder="37.7749"
				type="number"
				step="0.000001"
				class="form-input"
				required
			/>
		</div>
		<div class="form-group">
			<label for="location-lng" class="form-label">Longitude <span class="required">*</span></label>
			<input
				id="location-lng"
				bind:value={locationLng}
				placeholder="-122.4194"
				type="number"
				step="0.000001"
				class="form-input"
				required
			/>
		</div>
	</div>

	<div class="location-options">
		<label class="option-label">
			Marker Color
			<input type="color" bind:value={locationMarkerColor} class="color-input" />
		</label>
		<label class="option-label">
			Zoom Level: {locationZoom}
			<input type="range" bind:value={locationZoom} min="1" max="20" class="zoom-input" />
		</label>
	</div>

	<button
		type="button"
		class="submit-btn"
		onclick={handleLocationInsert}
		disabled={locationLat === '' || locationLng === ''}
	>
		{onLocationSelect ? 'Update Location' : 'Insert Location'}
	</button>
</div>

<style lang="scss">
	.location-form {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}

	.form-label {
		font-size: $font-size-extra-small;
		font-weight: 500;
		color: $gray-30;
	}

	.form-input,
	.form-textarea {
		padding: $unit $unit-2x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		background: $white;
		font-family: inherit;

		&:focus {
			outline: none;
			border-color: $primary-color;
		}
	}

	.form-textarea {
		resize: vertical;
		min-height: 60px;
	}

	.coordinates-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-2x;
	}

	.location-options {
		display: flex;
		gap: $unit-3x;
		align-items: center;
	}

	.option-label {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: $font-size-extra-small;
		font-weight: 500;
		color: $gray-30;
	}

	.color-input {
		width: 36px;
		height: 24px;
		padding: 0;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		cursor: pointer;
	}

	.zoom-input {
		width: 100px;
	}

	.submit-btn {
		width: 100%;
		padding: $unit-2x;
		background: $primary-color;
		color: $white;
		border: none;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover:not(:disabled) {
			background: color.adjust($primary-color, $lightness: -10%);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.required {
		color: $red-60;
	}
</style>
