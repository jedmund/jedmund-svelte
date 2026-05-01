<script lang="ts">
	import Check from '@lucide/svelte/icons/check'
	import LoaderCircle from '@lucide/svelte/icons/loader-circle'
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle'
	import type { AutoSaveState } from './forms/useAutoSave.svelte'

	interface Props {
		state: AutoSaveState
		onRetry?: () => void
		onReload?: () => void
	}

	let { state, onRetry, onReload }: Props = $props()
</script>

<span class="save-status" data-state={state} role="status" aria-live="polite">
	{#if state === 'saving'}
		<LoaderCircle class="save-status__icon save-status__icon--spin" size={14} />
		<span>Saving…</span>
	{:else if state === 'saved'}
		<Check class="save-status__icon" size={14} />
		<span>Saved</span>
	{:else if state === 'unsaved'}
		<span class="save-status__dot" aria-hidden="true"></span>
		<span>Unsaved</span>
	{:else if state === 'failed'}
		<AlertTriangle class="save-status__icon save-status__icon--warn" size={14} />
		<span>Save failed</span>
		{#if onRetry}
			<button type="button" class="save-status__action" onclick={onRetry}>Retry</button>
		{/if}
	{:else if state === 'conflict'}
		<AlertTriangle class="save-status__icon save-status__icon--warn" size={14} />
		<span>Conflict</span>
		<button
			type="button"
			class="save-status__action"
			onclick={() => (onReload ? onReload() : window.location.reload())}
		>
			Reload
		</button>
	{/if}
</span>

<style lang="scss">
	.save-status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8125rem;
		color: $gray-40;
		min-width: 80px;

		&[data-state='failed'],
		&[data-state='conflict'] {
			color: $red-60;
		}
	}

	:global(.save-status__icon) {
		flex-shrink: 0;
	}

	:global(.save-status__icon--spin) {
		animation: save-status-spin 0.9s linear infinite;
	}

	:global(.save-status__icon--warn) {
		color: $red-60;
	}

	@keyframes save-status-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.save-status__dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: $gray-60;
	}

	.save-status__action {
		background: none;
		border: none;
		padding: 0 2px;
		font: inherit;
		color: $red-60;
		cursor: pointer;
		text-decoration: underline;

		&:hover {
			color: $red-50;
		}
	}
</style>
