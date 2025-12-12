<script lang="ts">
  import type { AutoSaveStatus } from '$lib/admin/autoSave'
  import { formatTimeAgo } from '$lib/utils/time'

  interface Props {
    statusStore?: { subscribe: (run: (v: AutoSaveStatus) => void) => () => void }
    errorStore?: { subscribe: (run: (v: string | null) => void) => () => void }
    status?: AutoSaveStatus
    error?: string | null
    lastSavedAt?: Date | string | null
    showTimestamp?: boolean
    compact?: boolean
    onclick?: () => void
  }

  let {
    statusStore,
    errorStore,
    status: statusProp,
    error: errorProp,
    lastSavedAt,
    showTimestamp = true,
    compact = true,
    onclick
  }: Props = $props()

  // Support both old subscription-based stores and new reactive values
  let status = $state<AutoSaveStatus>('idle')
  let errorText = $state<string | null>(null)
  let refreshKey = $state(0) // Used to force re-render for time updates

  $effect(() => {
    // If using direct props (new runes-based store)
    if (statusProp !== undefined) {
      status = statusProp
      errorText = errorProp ?? null
      return
    }

    // Otherwise use subscriptions (old store)
    if (!statusStore) return

    const unsub = statusStore.subscribe((v) => (status = v))
    let unsubErr: (() => void) | null = null
    if (errorStore) unsubErr = errorStore.subscribe((v) => (errorText = v))
    return () => {
      unsub()
      if (unsubErr) unsubErr()
    }
  })

  // Auto-refresh timestamp every 30 seconds
  $effect(() => {
    if (!lastSavedAt || !showTimestamp) return

    const interval = setInterval(() => {
      refreshKey++
    }, 30000)

    return () => clearInterval(interval)
  })

  const label = $derived.by(() => {
    // Force dependency on refreshKey to trigger re-computation
    void refreshKey

    switch (status) {
      case 'saving':
        return 'Saving…'
      case 'saved':
      case 'idle':
        return lastSavedAt && showTimestamp
          ? `Saved ${formatTimeAgo(lastSavedAt)}`
          : 'All changes saved'
      case 'offline':
        return 'Offline'
      case 'error':
        return errorText ? `Error — ${errorText}` : 'Save failed'
      default:
        return ''
    }
  })
</script>

{#if label}
  <button
    type="button"
    class="autosave-status"
    class:compact
    class:clickable={!!onclick && status !== 'saving'}
    onclick={onclick}
    disabled={status === 'saving'}
  >
    {#if status === 'saving'}
      <span class="spinner" aria-hidden="true"></span>
    {/if}
    <span class="text">{label}</span>
  </button>
{/if}

<style lang="scss">
  .autosave-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: $gray-40;
    font-size: 0.875rem;
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;

    &.compact {
      font-size: 0.75rem;
    }

    &.clickable {
      cursor: pointer;

      &:hover {
        color: $gray-20;
      }
    }

    &:disabled {
      cursor: default;
    }
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid $gray-80;
    border-top-color: $gray-40;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
