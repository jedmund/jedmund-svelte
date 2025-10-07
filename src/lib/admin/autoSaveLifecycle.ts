import { beforeNavigate } from '$app/navigation'
import { onDestroy } from 'svelte'
import type { AutoSaveController } from './autoSave'

interface AutoSaveLifecycleOptions {
  isReady?: () => boolean
  onFlushError?: (error: unknown) => void
  enableShortcut?: boolean
}

export function initAutoSaveLifecycle(
  controller: AutoSaveController,
  options: AutoSaveLifecycleOptions = {}
) {
  const { isReady = () => true, onFlushError, enableShortcut = true } = options

  if (typeof window === 'undefined') {
    onDestroy(() => controller.destroy())
    return
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!enableShortcut) return
    if (!isReady()) return
    const key = event.key.toLowerCase()
    const isModifier = event.metaKey || event.ctrlKey
    if (!isModifier || key !== 's') return
    event.preventDefault()
    controller.flush().catch((error) => {
      onFlushError?.(error)
    })
  }

  if (enableShortcut) {
    document.addEventListener('keydown', handleKeydown)
  }

  const stopNavigating = beforeNavigate(async (navigation) => {
    if (!isReady()) return
    navigation.cancel()
    try {
      await controller.flush()
      navigation.retry()
    } catch (error) {
      onFlushError?.(error)
    }
  })

  const stop = () => {
    if (enableShortcut) {
      document.removeEventListener('keydown', handleKeydown)
    }
    stopNavigating?.()
    controller.destroy()
  }

  onDestroy(stop)

  return { stop }
}
