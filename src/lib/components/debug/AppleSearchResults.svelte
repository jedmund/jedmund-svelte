<script lang="ts">
	import { onDestroy } from 'svelte'
	let { results }: { results: unknown } = $props()
	let copied = $state(false)
	let timer: ReturnType<typeof setTimeout> | undefined
	let disposed = false
	onDestroy(() => {
		disposed = true
		clearTimeout(timer)
	})
	async function copyResults() {
		try {
			await navigator.clipboard.writeText(JSON.stringify(results, null, 2))
			if (disposed) return
			clearTimeout(timer)
			copied = true
			timer = setTimeout(() => (copied = false), 2000)
		} catch (error) {
			console.error('Failed to copy:', error)
		}
	}
</script>

<div class="results-section">
	<h3>Results</h3>

	<div class="result-tabs">
		<button class="tab" class:active={true} onclick={() => {}}> Raw JSON </button>
		<button class="copy-btn" onclick={copyResults}>
			{copied ? 'Copied!' : 'Copy to Clipboard'}
		</button>
	</div>

	<div class="results-content">
		<pre>{JSON.stringify(results, null, 2)}</pre>
	</div>
</div>

<style lang="scss">
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
			font-size: $font-size-small;
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
</style>
