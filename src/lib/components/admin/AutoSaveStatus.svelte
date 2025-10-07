<script lang="ts">
  import type { AutoSaveStatus } from '$lib/admin/autoSave'

  interface Props {
    statusStore?: { subscribe: (run: (v: AutoSaveStatus) => void) => () => void }
    errorStore?: { subscribe: (run: (v: string | null) => void) => () => void }
    status?: AutoSaveStatus
    error?: string | null
    compact?: boolean
  }

  let { statusStore, errorStore, status: statusProp, error: errorProp, compact = true }: Props = $props()

  // Support both old subscription-based stores and new reactive values
  let status = $state<AutoSaveStatus>('idle')
  let errorText = $state<string | null>(null)

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

  const label = $derived.by(() => {
    switch (status) {
      case 'saving':
        return 'Saving…'
      case 'saved':
        return 'All changes saved'
      case 'offline':
        return 'Offline'
      case 'error':
        return errorText ? `Error — ${errorText}` : 'Save failed'
      case 'idle':
      default:
        return ''
    }
  })
</script>

{#if label}
  <div class="autosave-status" class:compact>
    {#if status === 'saving'}
      <span class="spinner" aria-hidden="true"></span>
    {/if}
    <span class="text">{label}</span>
  </div>
{/if}

<style lang="scss">
  .autosave-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: $gray-40;
    font-size: 0.875rem;

    &.compact {
      font-size: 0.75rem;
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
