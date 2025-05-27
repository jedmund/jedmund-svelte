<script lang="ts">
	import Page from '$lib/components/Page.svelte'
	import Editor from '$lib/components/admin/Editor.svelte'
	import type { JSONContent } from '@tiptap/core'
	
	let testContent = $state<JSONContent>({
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: 'Test the image upload functionality:'
					}
				]
			},
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: '1. Try pasting an image from clipboard (Cmd+V)'
					}
				]
			},
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: '2. Click the image placeholder below to upload'
					}
				]
			},
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: '3. Drag and drop an image onto the placeholder'
					}
				]
			},
			{
				type: 'image-placeholder'
			}
		]
	})
	
	let uploadedImages = $state<Array<{url: string, timestamp: string}>>([])
	
	function handleEditorChange(content: JSONContent) {
		testContent = content
		
		// Extract images from content
		const images: Array<{url: string, timestamp: string}> = []
		
		function extractImages(node: any) {
			if (node.type === 'image' && node.attrs?.src) {
				images.push({
					url: node.attrs.src,
					timestamp: new Date().toLocaleTimeString()
				})
			}
			if (node.content) {
				node.content.forEach(extractImages)
			}
		}
		
		if (content.content) {
			content.content.forEach(extractImages)
		}
		
		uploadedImages = images
	}
	
	// Check local uploads directory
	let localUploadsExist = $state(false)
	
	async function checkLocalUploads() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) return
			
			const response = await fetch('/api/media?limit=10', {
				headers: { Authorization: `Basic ${auth}` }
			})
			if (response.ok) {
				const data = await response.json()
				localUploadsExist = data.media.some((m: any) => m.url.includes('/local-uploads/'))
			}
		} catch (error) {
			console.error('Failed to check uploads:', error)
		}
	}
	
	// Check on mount and when images change
	$effect(() => {
		checkLocalUploads()
	})
	
	// Re-check when new images are uploaded
	$effect(() => {
		if (uploadedImages.length > 0) {
			setTimeout(checkLocalUploads, 500) // Small delay to ensure DB is updated
		}
	})
</script>

<Page>
	<header slot="header">
		<h1>Upload Test</h1>
		<a href="/admin/projects" class="back-link">← Back to Projects</a>
	</header>
	
	<div class="test-container">
		<div class="info-section">
			<h2>Image Upload Test</h2>
			<p>This page helps you test that image uploads are working correctly.</p>
			
			{#if localUploadsExist}
				<div class="status success">
					✅ Local uploads directory is configured
				</div>
			{:else}
				<div class="status warning">
					⚠️ No local uploads found yet
				</div>
			{/if}
			
			<div class="instructions">
				<h3>How to test:</h3>
				<ol>
					<li>Copy an image to your clipboard</li>
					<li>Click in the editor below and paste (Cmd+V)</li>
					<li>Or click the image placeholder to browse files</li>
					<li>Or drag and drop an image onto the placeholder</li>
				</ol>
			</div>
		</div>
		
		<div class="editor-section">
			<h3>Editor with Image Upload</h3>
			<Editor
				bind:data={testContent}
				onChange={handleEditorChange}
				placeholder="Start typing or paste an image..."
				minHeight={400}
			/>
		</div>
		
		{#if uploadedImages.length > 0}
			<div class="results-section">
				<h3>Uploaded Images</h3>
				<div class="image-grid">
					{#each uploadedImages as image}
						<div class="uploaded-image">
							<img src={image.url} alt="Uploaded" />
							<div class="image-info">
								<span class="timestamp">{image.timestamp}</span>
								<code class="url">{image.url}</code>
								{#if image.url.includes('/local-uploads/')}
									<span class="badge local">Local</span>
								{:else if image.url.includes('cloudinary')}
									<span class="badge cloud">Cloudinary</span>
								{:else}
									<span class="badge">Unknown</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
		
		<div class="json-section">
			<h3>Editor Content (JSON)</h3>
			<pre>{JSON.stringify(testContent, null, 2)}</pre>
		</div>
	</div>
</Page>

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		
		h1 {
			font-size: 1.75rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
		
		.back-link {
			color: $grey-40;
			text-decoration: none;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
			
			&:hover {
				color: $grey-20;
			}
		}
	}
	
	.test-container {
		max-width: 800px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}
	
	.info-section {
		background: white;
		padding: $unit-4x;
		border-radius: $unit-2x;
		margin-bottom: $unit-4x;
		box-sizing: border-box;
		overflow: hidden;
		
		h2 {
			margin: 0 0 $unit-2x;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
		
		p {
			color: $grey-30;
			margin-bottom: $unit-3x;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}
	
	.status {
		padding: $unit-2x $unit-3x;
		border-radius: $unit;
		margin-bottom: $unit-3x;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		
		&.success {
			background: #e6f7e6;
			color: #2d662d;
		}
		
		&.warning {
			background: #fff4e6;
			color: #996600;
		}
	}
	
	.instructions {
		h3 {
			font-size: 1rem;
			margin-bottom: $unit-2x;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
		
		ol {
			margin: 0;
			padding-left: $unit-4x;
			
			li {
				margin-bottom: $unit;
				color: $grey-30;
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
			}
		}
	}
	
	.editor-section {
		background: white;
		padding: $unit-4x;
		border-radius: $unit-2x;
		margin-bottom: $unit-4x;
		box-sizing: border-box;
		overflow: hidden;
		
		h3 {
			margin: 0 0 $unit-3x;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}
	
	.results-section {
		background: white;
		padding: $unit-4x;
		border-radius: $unit-2x;
		margin-bottom: $unit-4x;
		box-sizing: border-box;
		overflow: hidden;
		
		h3 {
			margin: 0 0 $unit-3x;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}
	
	.image-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: $unit-3x;
	}
	
	.uploaded-image {
		border: 1px solid $grey-80;
		border-radius: $unit;
		overflow: hidden;
		
		img {
			width: 100%;
			height: 150px;
			object-fit: cover;
		}
		
		.image-info {
			padding: $unit-2x;
			background: $grey-95;
			
			.timestamp {
				display: block;
				font-size: 0.875rem;
				color: $grey-40;
				margin-bottom: $unit;
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
			}
			
			.url {
				display: block;
				font-size: 0.75rem;
				word-break: break-all;
				color: $grey-30;
				margin-bottom: $unit;
				overflow-wrap: break-word;
				max-width: 100%;
			}
			
			.badge {
				display: inline-block;
				padding: 2px 8px;
				font-size: 0.75rem;
				border-radius: 4px;
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
				
				&.local {
					background: #e6f0ff;
					color: #0066cc;
				}
				
				&.cloud {
					background: #f0e6ff;
					color: #6600cc;
				}
			}
		}
	}
	
	.json-section {
		background: white;
		padding: $unit-4x;
		border-radius: $unit-2x;
		box-sizing: border-box;
		overflow: hidden;
		
		h3 {
			margin: 0 0 $unit-3x;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
		
		pre {
			background: $grey-95;
			padding: $unit-3x;
			border-radius: $unit;
			overflow-x: auto;
			overflow-y: auto;
			max-height: 400px;
			font-size: 0.875rem;
			line-height: 1.5;
			margin: 0;
			color: $grey-10;
			white-space: pre-wrap;
			word-wrap: break-word;
		}
	}
</style>