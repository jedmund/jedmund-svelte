// Export the main composer component
export { default } from './ComposerCore.svelte'
export { default as Composer } from './ComposerCore.svelte'

// Export types
export type { ComposerVariant, ComposerFeatures, ComposerProps } from './types'

// Export individual components if needed elsewhere
export { default as ComposerToolbar } from './ComposerToolbar.svelte'
export { default as TextStyleDropdown } from './TextStyleDropdown.svelte'
export { default as MediaInsertDropdown } from './MediaInsertDropdown.svelte'
export { default as ComposerLinkManager } from './ComposerLinkManager.svelte'

// Export utilities
export { ComposerMediaHandler } from './ComposerMediaHandler.svelte'
export { useComposerEvents } from './useComposerEvents.svelte'
export { useDropdown } from './useDropdown.svelte'
export * from './editorConfig'
