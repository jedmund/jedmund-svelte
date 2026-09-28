<script lang="ts">
	import { onDestroy } from 'svelte'
	import XIcon from '$icons/x.svg?component'
	import AppleSearchControls from './debug/AppleSearchControls.svelte'
	import AppleSearchResults from './debug/AppleSearchResults.svelte'
	import { createAppleSearch, type AppleSearchState } from './debug/apple-search'
	import { modalFocus, lockModalScroll } from './admin/modal-lifecycle'
	let searchQuery = $state('')
	let storefront = $state('us')
	let searchState = $state<AppleSearchState>({
		open: false,
		searching: false,
		results: null,
		error: null,
		responseTime: 0
	})
	const search = createAppleSearch((next) => (searchState = next))
	onDestroy(search.dispose)
	$effect(() => {
		if (searchState.open) return lockModalScroll()
	})
	export function open() {
		searchQuery = ''
		search.open()
	}
</script>

{#if searchState.open}
	<div class="modal-overlay" role="presentation" onclick={search.close}>
		<div
			class="modal-container"
			role="dialog"
			aria-modal="true"
			aria-label="Apple Music API Search"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
			use:modalFocus={{
				isOpen: () => searchState.open,
				closeOnEscape: () => true,
				close: search.close
			}}
		>
			<div class="modal-header">
				<h2>Apple Music API Search</h2>
				<button type="button" class="close-btn" onclick={search.close} aria-label="Close"
					><XIcon /></button
				>
			</div>
			<div class="modal-body">
				<AppleSearchControls
					bind:searchQuery
					bind:storefront
					isSearching={searchState.searching}
					onSearch={() => search.search(searchQuery, storefront)}
				/>
				{#if searchState.error}<div class="error-message">
						<strong>Error:</strong>
						{searchState.error}
					</div>{/if}
				{#if searchState.responseTime > 0}<div class="response-time">
						Response time: {searchState.responseTime}ms
					</div>{/if}
				{#if searchState.results}<AppleSearchResults results={searchState.results} />{/if}
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
	.error-message {
		background: rgba(255, 59, 48, 0.1);
		border: 1px solid rgba(255, 59, 48, 0.3);
		color: #ff6b6b;
		padding: $unit;
		border-radius: 4px;
		font-size: $font-size-small;
		margin-bottom: $unit * 2;
	}
	.response-time {
		color: rgba(255, 255, 255, 0.6);
		font-size: 12px;
		margin-bottom: $unit;
	}
</style>
