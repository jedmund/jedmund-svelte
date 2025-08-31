export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

interface CreateAutoSaveControllerOptions<TPayload, TResponse = unknown> {
  debounceMs?: number
  getPayload: () => TPayload | null | undefined
  save: (payload: TPayload, ctx: { signal: AbortSignal }) => Promise<TResponse>
  onSaved?: (res: TResponse) => void
}

export function createAutoSaveController<TPayload, TResponse = unknown>(
  opts: CreateAutoSaveControllerOptions<TPayload, TResponse>
) {
  const debounceMs = opts.debounceMs ?? 2000
  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null
  let lastSentHash: string | null = null

  let _status: AutoSaveStatus = 'idle'
  let _lastError: string | null = null
  const statusSubs = new Set<(v: AutoSaveStatus) => void>()
  const errorSubs = new Set<(v: string | null) => void>()

  function setStatus(next: AutoSaveStatus) {
    _status = next
    statusSubs.forEach((fn) => fn(_status))
  }

  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void run(), debounceMs)
  }

  async function run() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    const payload = opts.getPayload()
    if (!payload) return

    const hash = safeHash(payload)
    if (lastSentHash && hash === lastSentHash) return

    if (controller) controller.abort()
    controller = new AbortController()

    setStatus('saving')
    _lastError = null
    try {
      const res = await opts.save(payload, { signal: controller.signal })
      lastSentHash = hash
      setStatus('saved')
      if (opts.onSaved) opts.onSaved(res)
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // Newer save superseded this one
        return
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus('offline')
      } else {
        setStatus('error')
      }
      _lastError = e?.message || 'Auto-save failed'
      errorSubs.forEach((fn) => fn(_lastError))
    }
  }

  function flush() {
    return run()
  }

  function destroy() {
    if (timer) clearTimeout(timer)
    if (controller) controller.abort()
  }

  return {
    status: {
      subscribe(run: (v: AutoSaveStatus) => void) {
        run(_status)
        statusSubs.add(run)
        return () => statusSubs.delete(run)
      }
    },
    lastError: {
      subscribe(run: (v: string | null) => void) {
        run(_lastError)
        errorSubs.add(run)
        return () => errorSubs.delete(run)
      }
    },
    schedule,
    flush,
    destroy
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
