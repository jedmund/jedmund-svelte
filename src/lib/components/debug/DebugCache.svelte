<script lang="ts">
	import DebugSection from './DebugSection.svelte'
	import type { CacheSelector } from './debug-requests'
	let {
		cacheKey = $bindable(),
		isClearing,
		clear,
		onSearch
	}: {
		cacheKey: string
		isClearing: boolean
		clear: (selector: CacheSelector, label: string) => Promise<boolean>
		onSearch: () => void
	} = $props()
	async function clearCache() {
		const submitted = cacheKey
		if (!submitted.trim()) return
		if ((await clear({ key: submitted }, 'Cleared cache')) && cacheKey === submitted) cacheKey = ''
	}
</script>

<DebugSection title="Redis Cache Management">
	<div class="cache-controls">
		<input
			type="text"
			bind:value={cacheKey}
			placeholder="Cache key (e.g., apple:album:Artist:Album)"
			disabled={isClearing}
		/>
		<button onclick={clearCache} disabled={isClearing || !cacheKey.trim()} class="clear-btn">
			{isClearing ? 'Clearing...' : 'Clear Key'}
		</button>
	</div>

	<div class="cache-actions">
		<button onclick={onSearch} class="search-btn"> Test Apple Music Search </button>

		<div class="cache-divider"></div>

		<button
			onclick={() => clear({ pattern: 'apple:album:*' }, 'Cleared all music cache')}
			disabled={isClearing}
			class="clear-all-btn"
		>
			{isClearing ? 'Clearing...' : 'Clear All Music Cache'}
		</button>

		<button
			onclick={() => clear({ pattern: 'notfound:apple-music:*' }, 'Cleared not found cache')}
			disabled={isClearing}
			class="clear-not-found-btn"
		>
			{isClearing ? 'Clearing...' : 'Clear Not Found Cache'}
		</button>
	</div>

	<div class="cache-help">
		<p>Key format: <code>apple:album:ArtistName:AlbumName</code></p>
		<p>Example: <code>apple:album:藤井風:Hachikō</code></p>
	</div>
</DebugSection>

<style lang="scss">
	.cache-controls {
		display: flex;
		gap: $unit;
		margin-bottom: $unit * 1.5;

		input {
			flex: 1;
			background: rgba(255, 255, 255, 0.1);
			border: 1px solid rgba(255, 255, 255, 0.2);
			color: white;
			padding: $unit;
			border-radius: $corner-radius-xs;
			font-size: $font-size-extra-small;
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
			}
		}

		.clear-btn {
			padding: $unit $unit * 2;
			background: $primary-color;
			border: none;
			color: white;
			border-radius: $corner-radius-xs;
			font-size: $font-size-extra-small;
			font-weight: $font-weight-med;
			cursor: pointer;
			transition: all $transition-normal;

			&:hover:not(:disabled) {
				background: color.adjust($primary-color, $lightness: -10%);
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}
	}
	.cache-actions {
		margin-bottom: $unit * 1.5;
		display: flex;
		flex-direction: column;
		gap: $unit;

		.clear-all-btn,
		.clear-not-found-btn,
		.search-btn {
			width: 100%;
			padding: $unit * 1.5;
			background: rgba(255, 255, 255, 0.08);
			border: 1px solid rgba(255, 255, 255, 0.15);
			border-radius: $corner-radius-xs;
			font-size: $font-size-extra-small;
			font-weight: $font-weight-med;
			cursor: pointer;
			transition: all $transition-normal;

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.search-btn {
			color: $info-color;

			&:hover {
				background: rgba($info-color, 0.15);
				border-color: rgba($info-color, 0.5);
			}
		}

		.cache-divider {
			height: 1px;
			background: rgba(255, 255, 255, 0.1);
			margin: $unit-half 0;
		}

		.clear-all-btn {
			color: $error-color;

			&:hover:not(:disabled) {
				background: rgba($error-color, 0.15);
				border-color: rgba($error-color, 0.5);
			}
		}

		.clear-not-found-btn {
			color: $warning-color;

			&:hover:not(:disabled) {
				background: rgba($warning-color, 0.15);
				border-color: rgba($warning-color, 0.5);
			}
		}
	}
	.cache-help {
		background: rgba(255, 255, 255, 0.05);
		padding: $unit;
		border-radius: $corner-radius-xs;

		p {
			margin: $unit-half 0;
			font-size: $font-size-extra-small;
			color: rgba(255, 255, 255, 0.7);

			code {
				background: rgba(255, 255, 255, 0.1);
				padding: 2px 4px;
				border-radius: $corner-radius-xs;
				font-size: $font-size-extra-small;
			}
		}
	}
</style>
