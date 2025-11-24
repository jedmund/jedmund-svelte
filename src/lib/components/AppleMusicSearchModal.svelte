<script lang="ts">
	import { onMount } from 'svelte'
	import XIcon from '$icons/x.svg'
	import LoaderIcon from '$icons/loader.svg'
	
	let isOpen = $state(false)
	let searchQuery = $state('')
	let storefront = $state('us')
	let isSearching = $state(false)
	let searchResults = $state<unknown>(null)
	let searchError = $state<string | null>(null)
	let responseTime = $state<number>(0)
	
	// Available storefronts
	const storefronts = [
		{ value: 'us', label: 'United States' },
		{ value: 'jp', label: 'Japan' },
		{ value: 'gb', label: 'United Kingdom' },
		{ value: 'ca', label: 'Canada' },
		{ value: 'au', label: 'Australia' },
		{ value: 'de', label: 'Germany' },
		{ value: 'fr', label: 'France' },
		{ value: 'es', label: 'Spain' },
		{ value: 'it', label: 'Italy' },
		{ value: 'kr', label: 'South Korea' },
		{ value: 'cn', label: 'China' },
		{ value: 'br', label: 'Brazil' }
	]
	
	export function open() {
		isOpen = true
		searchQuery = ''
		searchResults = null
		searchError = null
		responseTime = 0
	}
	
	function close() {
		isOpen = false
	}
	
	async function performSearch() {
		if (!searchQuery.trim()) {
			searchError = 'Please enter a search query'
			return
		}
		
		isSearching = true
		searchError = null
		searchResults = null
		
		const startTime = performance.now()
		
		try {
			const response = await fetch('/api/admin/debug/apple-music-search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: searchQuery,
					storefront
				})
			})
			
			responseTime = Math.round(performance.now() - startTime)
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}
			
			searchResults = await response.json()
		} catch (error) {
			searchError = error instanceof Error ? error.message : 'Unknown error occurred'
			searchResults = null
		} finally {
			isSearching = false
		}
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			close()
		} else if (e.key === 'Enter' && !isSearching) {
			performSearch()
		}
	}
	
	onMount(() => {
		window.addEventListener('keydown', handleKeydown)
		return () => window.removeEventListener('keydown', handleKeydown)
	})
</script>

{#if isOpen}
	<div class="modal-overlay" role="presentation" onclick={close}>
		<div
			class="modal-container"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="modal-header">
				<h2>Apple Music API Search</h2>
				<button class="close-btn" onclick={close} aria-label="Close">
					<XIcon />
				</button>
			</div>
			
			<div class="modal-body">
				<div class="search-controls">
					<div class="control-group">
						<label for="search-query">Search Query</label>
						<input
							id="search-query"
							type="text"
							bind:value={searchQuery}
							placeholder="e.g., Taylor Swift folklore"
							disabled={isSearching}
						/>
					</div>
					
					<div class="control-group">
						<label for="storefront">Storefront</label>
						<select id="storefront" bind:value={storefront} disabled={isSearching}>
							{#each storefronts as store}
								<option value={store.value}>{store.label}</option>
							{/each}
						</select>
					</div>
					
					<button 
						class="search-btn" 
						onclick={performSearch}
						disabled={isSearching || !searchQuery.trim()}
					>
						{#if isSearching}
							<LoaderIcon class="icon spinning" /> Searching...
						{:else}
							Search
						{/if}
					</button>
				</div>
				
				{#if searchError}
					<div class="error-message">
						<strong>Error:</strong> {searchError}
					</div>
				{/if}
				
				{#if responseTime > 0}
					<div class="response-time">
						Response time: {responseTime}ms
					</div>
				{/if}
				
				{#if searchResults}
					<div class="results-section">
						<h3>Results</h3>
						
						<div class="result-tabs">
							<button 
								class="tab" 
								class:active={true}
								onclick={() => {}}
							>
								Raw JSON
							</button>
							<button 
								class="copy-btn"
								onclick={async () => {
									try {
										await navigator.clipboard.writeText(JSON.stringify(searchResults, null, 2))
										// Show a temporary success message
										const btn = event?.target as HTMLButtonElement
										if (btn) {
											const originalText = btn.textContent
											btn.textContent = 'Copied!'
											setTimeout(() => {
												btn.textContent = originalText
											}, 2000)
										}
									} catch (err) {
										console.error('Failed to copy:', err)
									}
								}}
							>
								Copy to Clipboard
							</button>
						</div>
						
						<div class="results-content">
							<pre>{JSON.stringify(searchResults, null, 2)}</pre>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(4px);
	}
	
	.modal-container {
		background: rgba(20, 20, 20, 0.98);
		border-radius: $unit * 1.5;
		width: 90%;
		max-width: 800px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit * 2;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		
		h2 {
			margin: 0;
			color: white;
			font-size: 18px;
			font-weight: 600;
		}
		
		.close-btn {
			background: none;
			border: none;
			color: rgba(255, 255, 255, 0.6);
			cursor: pointer;
			padding: $unit-half;
			border-radius: 4px;
			transition: all 0.2s;
			
			:global(svg) {
				width: 20px;
				height: 20px;
			}
			
			&:hover {
				color: white;
				background: rgba(255, 255, 255, 0.1);
			}
		}
	}
	
	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: $unit * 2;
	}
	
	.search-controls {
		display: flex;
		gap: $unit * 2;
		margin-bottom: $unit * 2;
		align-items: flex-end;
		
		.control-group {
			flex: 1;
			
			label {
				display: block;
				color: rgba(255, 255, 255, 0.8);
				font-size: 12px;
				font-weight: 500;
				margin-bottom: $unit-half;
			}
			
			input, select {
				width: 100%;
				background: rgba(255, 255, 255, 0.1);
				border: 1px solid rgba(255, 255, 255, 0.2);
				color: white;
				padding: $unit;
				border-radius: 4px;
				font-size: 14px;
				font-family: inherit;
				
				&::placeholder {
					color: rgba(255, 255, 255, 0.4);
				}
				
				&:focus {
					outline: none;
					border-color: $primary-color;
					background: rgba(255, 255, 255, 0.15);
				}
				
				&:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
			}
		}
		
		.search-btn {
			padding: $unit $unit * 2;
			background: $primary-color;
			border: none;
			color: white;
			border-radius: 4px;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
			display: flex;
			align-items: center;
			gap: $unit-half;
			white-space: nowrap;
			
			&:hover:not(:disabled) {
				background: darken($primary-color, 10%);
			}
			
			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
			
			:global(.icon) {
				width: 16px;
				height: 16px;
			}
		}
	}
	
	.error-message {
		background: rgba(255, 59, 48, 0.1);
		border: 1px solid rgba(255, 59, 48, 0.3);
		color: #ff6b6b;
		padding: $unit;
		border-radius: 4px;
		font-size: 13px;
		margin-bottom: $unit * 2;
	}
	
	.response-time {
		color: rgba(255, 255, 255, 0.6);
		font-size: 12px;
		margin-bottom: $unit;
	}
	
	.results-section {
		margin-top: $unit * 2;
		
		h3 {
			margin: 0 0 $unit 0;
			color: #87ceeb;
			font-size: 16px;
			font-weight: 600;
		}
	}
	
	.result-tabs {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		margin-bottom: $unit * 2;
		
		.tab {
			padding: $unit $unit * 2;
			background: none;
			border: none;
			color: rgba(255, 255, 255, 0.6);
			cursor: pointer;
			font-size: 13px;
			font-weight: 500;
			transition: all 0.2s;
			border-bottom: 2px solid transparent;
			
			&:hover {
				color: rgba(255, 255, 255, 0.8);
			}
			
			&.active {
				color: white;
				border-bottom-color: $primary-color;
			}
		}
		
		.copy-btn {
			padding: $unit-half $unit;
			background: rgba(255, 255, 255, 0.1);
			border: 1px solid rgba(255, 255, 255, 0.2);
			color: rgba(255, 255, 255, 0.8);
			border-radius: 4px;
			font-size: 12px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
			
			&:hover {
				background: rgba(255, 255, 255, 0.15);
				border-color: rgba(255, 255, 255, 0.3);
				color: white;
			}
		}
	}
	
	.results-content {
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		max-height: 400px;
		overflow-y: auto;
		
		pre {
			margin: 0;
			padding: $unit * 1.5;
			font-size: 12px;
			line-height: 1.5;
			color: rgba(255, 255, 255, 0.9);
			font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
		}
	}
	
	:global(.spinning) {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>