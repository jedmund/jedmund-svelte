export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

export interface AutoSaveStoreOptions<TPayload, TResponse = unknown> {
  debounceMs?: number
  idleResetMs?: number
  getPayload: () => TPayload | null | undefined
  save: (payload: TPayload, ctx: { signal: AbortSignal }) => Promise<TResponse>
  onSaved?: (res: TResponse, ctx: { prime: (payload: TPayload) => void }) => void
}

export interface AutoSaveStore<TPayload, _TResponse = unknown> {
  readonly status: AutoSaveStatus
  readonly lastError: string | null
  schedule: () => void
  flush: () => Promise<void>
  destroy: () => void
  prime: (payload: TPayload) => void
}

/**
 * Creates a reactive autosave store using Svelte 5 runes.
 * Must be called within component context (.svelte or .svelte.ts files).
 *
 * @example
 * const autoSave = createAutoSaveStore({
 *   getPayload: () => formData,
 *   save: async (payload) => api.put('/endpoint', payload),
 *   onSaved: (response, { prime }) => {
 *     formData = response
 *     prime(response)
 *   }
 * })
 *
 * // In template: {autoSave.status}
 * // Trigger save: autoSave.schedule()
 */
export function createAutoSaveStore<TPayload, TResponse = unknown>(
  opts: AutoSaveStoreOptions<TPayload, TResponse>
): AutoSaveStore<TPayload, unknown> {
  const debounceMs = opts.debounceMs ?? 2000
  const idleResetMs = opts.idleResetMs ?? 2000
  let timer: ReturnType<typeof setTimeout> | null = null
  let idleResetTimer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null
  let lastSentHash: string | null = null

  let status = $state<AutoSaveStatus>('idle')
  let lastError = $state<string | null>(null)

  function setStatus(next: AutoSaveStatus) {
    if (idleResetTimer) {
      clearTimeout(idleResetTimer)
      idleResetTimer = null
    }

    status = next

    // Auto-transition from 'saved' to 'idle' after idleResetMs
    if (next === 'saved') {
      idleResetTimer = setTimeout(() => {
        status = 'idle'
        idleResetTimer = null
      }, idleResetMs)
    }
  }

  function prime(payload: TPayload) {
    lastSentHash = safeHash(payload)
  }

  function schedule() {
    if (timer) clearTimeout(timer)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.debug(`[AutoSave] Scheduled (${debounceMs}ms debounce)`)
    }
    timer = setTimeout(() => void run(), debounceMs)
  }

  async function run() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    const payload = opts.getPayload()
    if (!payload) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.debug('[AutoSave] Skipped: getPayload returned null/undefined')
      }
      return
    }

    const hash = safeHash(payload)
    if (lastSentHash && hash === lastSentHash) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.debug('[AutoSave] Skipped: payload unchanged (hash match)')
      }
      return
    }

    if (controller) controller.abort()
    controller = new AbortController()

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.debug('[AutoSave] Saving...', { hashChanged: lastSentHash !== hash })
    }

    setStatus('saving')
    lastError = null
    try {
      const res = await opts.save(payload, { signal: controller.signal })
      lastSentHash = hash
      setStatus('saved')
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.debug('[AutoSave] Saved successfully')
      }
      if (opts.onSaved) opts.onSaved(res, { prime })
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // Newer save superseded this one
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.debug('[AutoSave] Aborted: superseded by newer save')
        }
        return
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus('offline')
      } else {
        setStatus('error')
      }
      lastError = e instanceof Error ? e.message : 'Auto-save failed'
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.debug('[AutoSave] Error:', lastError)
      }
    }
  }

  function flush() {
    return run()
  }

  function destroy() {
    if (timer) clearTimeout(timer)
    if (idleResetTimer) clearTimeout(idleResetTimer)
    if (controller) controller.abort()
  }

  return {
    get status() {
      return status
    },
    get lastError() {
      return lastError
    },
    schedule,
    flush,
    destroy,
    prime
  }
}

function safeHash(obj: unknown): string {
  try {
    return JSON.stringify(obj)
  } catch {
    // Fallback for circular structures; not expected for form payloads
    return String(obj)
  }
}
