<script lang="ts">
	import { type Editor, type NodeViewProps } from '@tiptap/core'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import MapPin from 'lucide-svelte/icons/map-pin'

	interface Props extends NodeViewProps {}
	let { node, editor, getPos, updateAttributes, deleteNode }: Props = $props()

	let latitude = $state<number | null>(null)
	let longitude = $state<number | null>(null)
	let title = $state('')
	let description = $state('')
	let markerColor = $state('#ef4444')
	let isConfigured = $state(false)

	function handleSubmit() {
		if (!latitude || !longitude || !title) {
			alert('Please fill in all required fields')
			return
		}

		// Replace this placeholder with the actual geolocation node
		const pos = getPos()
		if (typeof pos === 'number') {
			editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + node.nodeSize })
				.insertContent({
					type: 'geolocation',
					attrs: {
						latitude,
						longitude,
						title,
						description,
						markerColor
					}
				})
				.run()
		}
	}

	function handleCancel() {
		deleteNode()
	}
</script>

<NodeViewWrapper>
	<div class="geolocation-placeholder">
		<div class="icon">
			<MapPin size={24} />
		</div>

		{#if !isConfigured}
			<div class="content">
				<h3>Add Location</h3>
				<p>Add a map with a location marker</p>
				<button class="configure-btn" onclick={() => (isConfigured = true)}>
					Configure Location
				</button>
			</div>
		{:else}
			<div class="form">
				<h3>Configure Location</h3>

				<div class="form-group">
					<label for="latitude">Latitude <span class="required">*</span></label>
					<input
						id="latitude"
						type="number"
						step="0.000001"
						bind:value={latitude}
						placeholder="e.g., 37.7749"
						required
					/>
				</div>

				<div class="form-group">
					<label for="longitude">Longitude <span class="required">*</span></label>
					<input
						id="longitude"
						type="number"
						step="0.000001"
						bind:value={longitude}
						placeholder="e.g., -122.4194"
						required
					/>
				</div>

				<div class="form-group">
					<label for="title">Title <span class="required">*</span></label>
					<input id="title" type="text" bind:value={title} placeholder="Location name" required />
				</div>

				<div class="form-group">
					<label for="description">Description</label>
					<textarea
						id="description"
						bind:value={description}
						placeholder="Optional description"
						rows="3"
					></textarea>
				</div>

				<div class="form-group">
					<label for="markerColor">Marker Color</label>
					<input id="markerColor" type="color" bind:value={markerColor} />
				</div>

				<div class="actions">
					<button class="cancel-btn" onclick={handleCancel}>Cancel</button>
					<button class="submit-btn" onclick={handleSubmit}>Add Location</button>
				</div>
			</div>
		{/if}
	</div>
</NodeViewWrapper>

<style lang="scss">
	@import '$styles/variables';

	:global(.node-geolocationPlaceholder) {
		margin-bottom: 1rem;
		margin-left: 2.25rem;
		margin-right: 2.25rem;

		@media (max-width: 768px) {
			margin-left: 2rem;
			margin-right: 2rem;
		}
	}

	.geolocation-placeholder {
		background: $gray-95;
		border: 2px dashed $gray-85;
		border-radius: $corner-radius;
		padding: $unit-3x;
		text-align: center;
	}

	.icon {
		display: flex;
		justify-content: center;
		margin-bottom: $unit-2x;
		color: $gray-50;
	}

	.content {
		h3 {
			margin: 0 0 $unit;
			font-size: $font-size-large;
			font-weight: 600;
			color: $gray-10;
		}

		p {
			margin: 0 0 $unit-2x;
			color: $gray-50;
		}
	}

	.configure-btn {
		background: $primary-color;
		color: $white;
		border: none;
		border-radius: $corner-radius-sm;
		padding: $unit $unit-2x;
		font-size: $font-size-small;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;

		&:hover {
			background: darken($primary-color, 10%);
		}
	}

	.form {
		text-align: left;
		max-width: 400px;
		margin: 0 auto;

		h3 {
			margin: 0 0 20px;
			font-size: 18px;
			font-weight: 600;
			color: #1f2937;
			text-align: center;
		}
	}

	.form-group {
		margin-bottom: 16px;

		label {
			display: block;
			margin-bottom: 4px;
			font-size: 14px;
			font-weight: 500;
			color: #374151;
		}

		.required {
			color: #ef4444;
		}

		input,
		textarea {
			width: 100%;
			padding: 8px 12px;
			border: 1px solid #d1d5db;
			border-radius: 6px;
			font-size: 14px;
			font-family: inherit;
			box-sizing: border-box;

			&:focus {
				outline: none;
				border-color: #3b82f6;
				box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
			}
		}

		input[type='color'] {
			width: 60px;
			height: 36px;
			padding: 4px;
			cursor: pointer;
		}
	}

	.actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 24px;
	}

	.cancel-btn,
	.submit-btn {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.cancel-btn {
		background: #f3f4f6;
		color: #374151;

		&:hover {
			background: #e5e7eb;
		}
	}

	.submit-btn {
		background: #3b82f6;
		color: white;

		&:hover {
			background: #2563eb;
		}
	}
</style>
