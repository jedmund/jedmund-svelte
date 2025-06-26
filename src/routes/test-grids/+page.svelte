<script lang="ts">
	import PhotoGrid from '$components/PhotoGrid.svelte'
	import type { Photo } from '$lib/types/photos'

	// Sample data for testing
	const samplePhotos: Photo[] = [
		{
			id: 'photo-1',
			src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
			alt: 'Mountain landscape',
			caption: 'Beautiful mountain view',
			width: 1600,
			height: 900,
			aspectRatio: 16/9
		},
		{
			id: 'photo-2',
			src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e',
			alt: 'Valley view',
			caption: 'Green valley',
			width: 1200,
			height: 800,
			aspectRatio: 3/2
		},
		{
			id: 'photo-3', 
			src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
			alt: 'Forest path',
			caption: 'Winding forest trail',
			width: 2400,
			height: 800,
			aspectRatio: 3/1 // Ultrawide
		},
		{
			id: 'photo-4',
			src: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716',
			alt: 'Waterfall',
			caption: 'Cascading waterfall',
			width: 800,
			height: 1200,
			aspectRatio: 2/3
		},
		{
			id: 'photo-5',
			src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
			alt: 'Sunrise',
			caption: 'Golden hour sunrise',
			width: 1200,
			height: 1200,
			aspectRatio: 1
		},
		{
			id: 'photo-6',
			src: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0',
			alt: 'Desert dunes',
			caption: 'Sandy desert landscape',
			width: 1000,
			height: 1500,
			aspectRatio: 2/3
		},
		{
			id: 'photo-7',
			src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
			alt: 'Mountain peaks',
			caption: 'Snow-capped mountains',
			width: 1800,
			height: 1200,
			aspectRatio: 3/2
		},
		{
			id: 'photo-8',
			src: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e',
			alt: 'Ocean waves',
			caption: 'Crashing waves',
			width: 1600,
			height: 900,
			aspectRatio: 16/9
		}
	]

	// PhotoGrid parameters
	let columns: 1 | 2 | 3 | 'auto' = $state('auto')
	let gap: 'small' | 'medium' | 'large' = $state('medium')
	let masonry = $state(false)
	let showCaptions = $state(false)
</script>

<div class="test-container">
	<h1>PhotoGrid Component Test</h1>
	
	<div class="controls">
		<div class="control-group">
			<label>
				Columns:
				<select bind:value={columns}>
					<option value={1}>1 Column</option>
					<option value={2}>2 Columns</option>
					<option value={3}>3 Columns</option>
					<option value="auto">Auto</option>
				</select>
			</label>
		</div>

		<div class="control-group">
			<label>
				Gap:
				<select bind:value={gap}>
					<option value="small">Small</option>
					<option value="medium">Medium</option>
					<option value="large">Large</option>
				</select>
			</label>
		</div>

		<div class="control-group">
			<label>
				<input type="checkbox" bind:checked={masonry} />
				Masonry Layout
			</label>
		</div>

		<div class="control-group">
			<label>
				<input type="checkbox" bind:checked={showCaptions} />
				Show Captions
			</label>
		</div>
	</div>

	<div class="config-display">
		<code>{`<PhotoGrid photos={photos} columns={${columns}} gap="${gap}" masonry={${masonry}} showCaptions={${showCaptions}} />`}</code>
	</div>

	<div class="grid-preview">
		<PhotoGrid 
			photos={samplePhotos} 
			{columns} 
			{gap} 
			{masonry} 
			{showCaptions} 
		/>
	</div>
</div>

<style>
	.test-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		margin-bottom: 2rem;
		color: #333;
	}

	.controls {
		display: flex;
		gap: 2rem;
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: #f5f5f5;
		border-radius: 8px;
		flex-wrap: wrap;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.control-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		color: #555;
	}

	select {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		font-size: 14px;
		cursor: pointer;
	}

	input[type="checkbox"] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.config-display {
		margin-bottom: 2rem;
		padding: 1rem;
		background: #f9f9f9;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		overflow-x: auto;
	}

	.config-display code {
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 14px;
		color: #666;
	}

	.grid-preview {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 2rem;
		background: white;
		min-height: 400px;
	}

	@media (max-width: 768px) {
		.controls {
			flex-direction: column;
			gap: 1rem;
		}

		.test-container {
			padding: 1rem;
		}

		.grid-preview {
			padding: 1rem;
		}
	}
</style>