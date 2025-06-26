# SVG Usage Analysis Report

## Summary

This analysis examines SVG usage patterns in the Svelte 5 codebase to identify optimization opportunities, inconsistencies, and unused assets.

## Key Findings

### 1. Inline SVGs vs. Imported SVGs

**Inline SVGs Found:**
- **Close/X buttons**: Found in 7+ components with identical SVG code
  - `admin/Modal.svelte`
  - `admin/UnifiedMediaModal.svelte`
  - `admin/MediaInput.svelte`
  - `admin/AlbumSelectorModal.svelte`
  - `admin/GalleryManager.svelte`
  - `admin/MediaDetailsModal.svelte`
  - `Lightbox.svelte`
  
- **Loading spinners**: Found in 2+ components
  - `admin/Button.svelte`
  - `admin/ImageUploader.svelte`
  - `admin/GalleryUploader.svelte`

- **Navigation arrows**: Found in `PhotoLightbox.svelte`
- **Lock icon**: Found in `LabCard.svelte`
- **External link icon**: Found in `LabCard.svelte`

### 2. SVG Import Patterns

**Consistent patterns using aliases:**
```svelte
// Good - using $icons alias
import ArrowLeft from '$icons/arrow-left.svg'
import ChevronDownIcon from '$icons/chevron-down.svg'

// Component imports with ?component
import PhotosIcon from '$icons/photos.svg?component'
import ViewSingleIcon from '$icons/view-single.svg?component'

// Raw imports
import ChevronDownIcon from '$icons/chevron-down.svg?raw'
```

### 3. Unused SVG Files

**Unused icons in `/src/assets/icons/`:**
- `dashboard.svg`
- `metadata.svg`

**Unused illustrations in `/src/assets/illos/`:**
- `jedmund-blink.svg`
- `jedmund-headphones.svg`
- `jedmund-listening-downbeat.svg`
- `jedmund-listening.svg`
- `jedmund-open.svg`
- `jedmund-signing-downbeat.svg`
- `jedmund-singing.svg`
- `logo-figma.svg`
- `logo-maitsu.svg`
- `logo-pinterest.svg`
- `logo-slack.svg`

### 4. Duplicate SVG Definitions

**Close/X Button SVG** (appears 7+ times):
```svg
<path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
```

**Loading Spinner SVG** (appears 3+ times):
```svg
<svg class="spinner" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="25" stroke-dashoffset="25" stroke-linecap="round">
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
  </circle>
</svg>
```

### 5. SVGs That Could Be Componentized

1. **Close Button**: Used across multiple modals and components
2. **Loading Spinner**: Used in buttons and upload components
3. **Navigation Arrows**: Used in lightbox and potentially other navigation
4. **Status Icons**: Lock, external link, eye icons in LabCard

## Recommendations

### 1. Create Reusable Icon Components

**Option A: Create individual icon components**
```svelte
<!-- $lib/components/icons/CloseIcon.svelte -->
<script>
  let { size = 24, class: className = '' } = $props()
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" class={className}>
  <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
```

**Option B: Create an Icon component with name prop**
```svelte
<!-- $lib/components/Icon.svelte -->
<script>
  import CloseIcon from '$icons/close.svg'
  import LoadingIcon from '$icons/loading.svg'
  // ... other imports
  
  let { name, size = 24, class: className = '' } = $props()
  
  const icons = {
    close: CloseIcon,
    loading: LoadingIcon,
    // ... other icons
  }
  
  const IconComponent = $derived(icons[name])
</script>

{#if IconComponent}
  <IconComponent {size} class={className} />
{/if}
```

### 2. Extract Inline SVGs to Files

Create new SVG files for commonly used inline SVGs:
- `/src/assets/icons/close.svg`
- `/src/assets/icons/loading.svg`
- `/src/assets/icons/external-link.svg`
- `/src/assets/icons/lock.svg`
- `/src/assets/icons/eye-off.svg`

### 3. Clean Up Unused Assets

Remove the following unused files to reduce bundle size:
- All unused illustration files (11 files)
- Unused icon files (2 files)

### 4. Standardize Import Methods

Establish a consistent pattern:
- Use `?component` for SVGs used as Svelte components
- Use direct imports for SVGs used as images
- Avoid `?raw` imports unless necessary

### 5. Create a Loading Component

```svelte
<!-- $lib/components/LoadingSpinner.svelte -->
<script>
  let { size = 24, class: className = '' } = $props()
</script>

<svg class="loading-spinner {className}" width={size} height={size} viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" 
          stroke-dasharray="25" stroke-dashoffset="25" stroke-linecap="round">
    <animateTransform attributeName="transform" type="rotate" 
                      from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
  </circle>
</svg>

<style>
  .loading-spinner {
    color: currentColor;
  }
</style>
```

## Benefits of These Changes

1. **Reduced code duplication**: Eliminate 20+ duplicate SVG definitions
2. **Smaller bundle size**: Remove 13 unused SVG files
3. **Better maintainability**: Centralized icon management
4. **Consistent styling**: Easier to apply consistent styles to all icons
5. **Type safety**: With proper component props
6. **Performance**: Less inline SVG parsing, better caching

## Implementation Priority

1. **High Priority**: Extract and componentize duplicate inline SVGs (close button, loading spinner)
2. **Medium Priority**: Remove unused SVG files
3. **Low Priority**: Standardize all import patterns and create comprehensive icon system