export type Draft<T = unknown> = { payload: T; ts: number }

export function makeDraftKey(type: string, id: string | number) {
  return `admin:draft:${type}:${id}`
}

export function saveDraft<T>(key: string, payload: T) {
  try {
    const entry: Draft<T> = { payload, ts: Date.now() }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Ignore quota or serialization errors
  }
}

export function loadDraft<T = unknown>(key: string): Draft<T> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as Draft<T>
  } catch {
    return null
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {}
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec} second${sec !== 1 ? 's' : ''} ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`
  const day = Math.floor(hr / 24)
  if (day <= 29) {
    if (day < 7) return `${day} day${day !== 1 ? 's' : ''} ago`
    const wk = Math.floor(day / 7)
    return `${wk} week${wk !== 1 ? 's' : ''} ago`
  }
  // Beyond 29 days, show a normal localized date
  return new Date(ts).toLocaleDateString()
}
