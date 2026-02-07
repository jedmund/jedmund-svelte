# Edra Media Extensions Analysis

**Date:** 2026-02-06
**Purpose:** Analyze our media extensions vs upstream to determine best migration strategy

---

## Architecture Comparison

### Upstream Edra Pattern (Simple)

**Structure:**
```
extensions/image/
  ├── ImageExtended.ts       (27 lines) - Node definition
  ├── ImagePlaceholder.ts    (71 lines) - Placeholder node definition
headless/components/
  ├── ImagePlaceholder.svelte (23 lines) - Simple prompt UI
  ├── ImageExtended.svelte    (??lines) - Display component
components/
  └── MediaPlaceHolder.svelte (31 lines) - Reusable wrapper
```

**Key Features:**
- ✅ Simple, clean separation of concerns
- ✅ Reusable `MediaPlaceHolder` wrapper component
- ✅ Centralized strings via `strings.ts`
- ✅ Minimal code duplication
- ✅ Uses Svelte 5 snippets properly
- ❌ Just URL prompts (no upload, no media library)
- ❌ No progress indicators
- ❌ No media tracking (no `mediaId`)

---

### Our Current Pattern (Sophisticated)

**Structure:**
```
extensions/image/
  ├── ImageExtended.ts       (48 lines) - Node + mediaId attribute
  ├── ImagePlaceholder.ts    (64 lines) - Placeholder node
headless/components/
  ├── ImagePlaceholder.svelte (260 lines) - Full media library + upload
  ├── EnhancedImagePlaceholder.svelte - Alternative version
  ├── ImageExtended.svelte    (??lines) - Display component
  └── ContentInsertionPane.svelte - Floating pane pattern
editor-extensions.ts (200+ lines) - Configuration layer with callbacks
```

**Key Features:**
- ✅ Full media library integration (`UnifiedMediaModal`)
- ✅ Direct file upload with progress indicators
- ✅ Media ID tracking for backend integration
- ✅ Keyboard navigation support
- ✅ Rich UI with multiple options
- ✅ Album context awareness (for Audio)
- ✅ Pane manager for floating UI
- ✅ Callback system for extensibility
- ❌ High complexity (~260 lines per placeholder)
- ❌ Code duplication across Audio/Video/Image
- ❌ Tightly coupled to our backend (`/api/media/upload`)
- ❌ Not using upstream patterns
- ❌ Harder to maintain

---

## Detailed Comparison: Image Extension

### Extension Definition (ImageExtended.ts)

**Our Version:**
```typescript
addAttributes() {
  return {
    src, alt, title, width, height, align,
    mediaId: {  // ← OUR ADDITION
      default: null,
      parseHTML: (element) => element.getAttribute('data-media-id'),
      renderHTML: (attributes) => ({ 'data-media-id': attributes.mediaId })
    }
  }
}
configure({ allowBase64: true })  // ← We allow base64
```

**Upstream:**
```typescript
addAttributes() {
  return { src, alt, title, width, height, align }
}
configure({ allowBase64: false })
```

**Analysis:**
- `mediaId` attribute is **valuable** - links editor content to media library records
- Allows tracking, updating, deletion of media
- Needed for our media management system
- **Recommendation:** Keep `mediaId` attribute

---

### Placeholder Component (ImagePlaceholder.svelte)

**Our Version (260 lines):**
```svelte
<script>
  // Media library modal integration
  let isMediaLibraryOpen = $state(false)
  let isUploading = $state(false)

  function handleBrowseLibrary() { /* open modal */ }
  function handleDirectUpload() { /* trigger file input */ }
  function handleFileUpload() {
    // POST to /api/media/upload
    // Show loading spinner
    // Insert with mediaId
  }
  function handleMediaSelect(media) {
    // Insert from library with mediaId
  }
</script>

<NodeViewWrapper>
  <button onclick={handleDirectUpload}>Upload Image</button>
  <button onclick={handleBrowseLibrary}>Browse Library</button>
  <UnifiedMediaModal bind:isOpen={isMediaLibraryOpen} />
</NodeViewWrapper>

<style>/* 80 lines of custom styles */</style>
```

**Upstream (23 lines):**
```svelte
<script>
  function handleClick() {
    const url = prompt(strings.extension.image.enterURLPrompt)
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }
</script>

<MediaPlaceHolder icon={Image} title={strings...} onClick={handleClick} />
```

**Analysis:**
- Our version has **real functionality** that users need (upload, browse library)
- Upstream is just a placeholder implementation (literally just prompts)
- Our media library integration is **core to the CMS**
- **BUT** we have massive code duplication - Audio/Video/Image are ~90% identical

---

## Code Duplication Analysis

### Shared Logic Across Media Types

All our media placeholders (Audio, Video, Image) have nearly identical:

1. **State management:**
```typescript
let isMediaLibraryOpen = $state(false)
let isUploading = $state(false)
let fileInput: HTMLInputElement
```

2. **Handler functions:**
```typescript
function handleBrowseLibrary(e: MouseEvent) { /* identical */ }
function handleDirectUpload(e: MouseEvent) { /* identical */ }
function handleMediaSelect(media: Media | Media[]) {
  // Only difference: type: 'image' vs 'audio' vs 'video'
}
async function handleFileUpload(event: Event) {
  // Only difference: formData type, accept attribute
}
function handleKeyDown(e: KeyboardEvent) { /* identical */ }
```

3. **Template structure:**
```svelte
<button onclick={handleDirectUpload}>Upload {Type}</button>
<button onclick={handleBrowseLibrary}>Browse Library</button>
<UnifiedMediaModal fileType={type} />
<input type="file" accept={mimeType} />
```

4. **Styles:** ~90% identical (just icon colors differ)

**Total duplicated code:** ~700 lines (3 × ~260 lines - shared logic)

---

## Recommendations

### Option 1: Keep Current Architecture (Port As-Is)

**Pros:**
- Minimal migration work
- Known working implementation
- All features preserved

**Cons:**
- 700+ lines of duplicated code
- Doesn't leverage upstream improvements
- Harder to maintain going forward
- Misses opportunity to simplify

**Verdict:** ❌ Not recommended - technical debt accumulation

---

### Option 2: Hybrid - Upstream Pattern + Our Features (Recommended)

**Approach:**
1. **Create unified media placeholder component** (like upstream's `MediaPlaceHolder`)
2. **Extract common media insertion logic** into reusable composable
3. **Keep our media library integration** via callbacks
4. **Adopt upstream's extension structure** where possible

**Architecture:**
```
components/
  └── MediaPlaceholder.svelte        (~100 lines)
      - Handles upload + browse library
      - Accepts props: mediaType, icon, accept
      - Emits mediaId on insert

composables/
  └── useMediaInsertion.ts           (~50 lines)
      - Shared upload/insert logic
      - API calls
      - Error handling

extensions/
  image/
    ├── ImageExtended.ts             (keep our mediaId attribute)
    ├── ImagePlaceholder.ts          (use upstream, add mediaId config)
  audio/
    ├── AudioExtended.ts             (same pattern)
    ├── AudioPlaceholder.ts
  video/
    ├── VideoExtended.ts             (same pattern)
    ├── VideoPlaceholder.ts
  gallery/
    ├── GalleryExtended.ts           (custom, keep as-is)
    ├── GalleryPlaceholder.ts

headless/components/
  ├── MediaPlaceholder.svelte        (~100 lines total instead of 780)
  ├── ImagePlaceholder.svelte        (~15 lines - just wrapper)
  ├── AudioPlaceholder.svelte        (~15 lines - just wrapper)
  ├── VideoPlaceholder.svelte        (~15 lines - just wrapper)
```

**Code Reduction:**
- Before: ~780 lines (3 × 260)
- After: ~145 lines (100 unified + 3 × 15 wrappers)
- **Savings: 635 lines (81% reduction)**

**Benefits:**
- ✅ Eliminate 80% of code duplication
- ✅ Keep all our features (library, upload, mediaId)
- ✅ Easier to maintain (one component to update)
- ✅ More aligned with upstream patterns
- ✅ Better testability (one component to test)
- ✅ Consistent UX across all media types

**Migration Effort:** Medium (1-2 days)
- Create unified `MediaPlaceholder` component
- Update extension definitions to add `mediaId`
- Create thin wrappers for each media type
- Test thoroughly

**Verdict:** ✅ **RECOMMENDED**

---

### Option 3: Full Upstream Adoption

**Approach:**
- Use upstream extensions as-is
- Lose media library integration
- Lose upload functionality
- Just URL prompts

**Verdict:** ❌ Not viable - loses core CMS functionality

---

## Specific Extensions Analysis

### Image Extension
- **Status:** Heavy customization needed
- **Recommendation:** Use Option 2 (unified component)
- **Custom features to preserve:** Media library, upload, mediaId, EXIF data

### Audio Extension
- **Status:** Heavy customization + album context
- **Recommendation:** Use Option 2 + keep album context logic
- **Custom features:** Pane manager, ContentInsertionPane, album awareness

### Video Extension
- **Status:** Heavy customization
- **Recommendation:** Use Option 2 (unified component)
- **Custom features:** Media library, upload, mediaId

### Gallery Extension
- **Status:** 100% custom (doesn't exist upstream)
- **Recommendation:** Keep as-is, update to use unified patterns
- **Custom features:** Multiple image management, layout, reordering

---

## Integration Layer (editor-extensions.ts)

### Current Approach
```typescript
export interface EditorExtensionOptions {
  onShowUrlConvertDropdown?: (pos: number, url: string) => void
  onShowLinkContextMenu?: (pos: number, url: string, coords) => void
  imagePlaceholderComponent?: Component
}

export function getEditorExtensions(options = {}) {
  const extensions = [
    AudioPlaceholder(AudioPlaceholderComponent),
    ImagePlaceholder(options.imagePlaceholderComponent || ImagePlaceholderComponent),
    // ... etc
  ]
}
```

**Issues:**
- Verbose extension registration
- Manual component passing
- Callback configuration scattered

### Proposed Approach
```typescript
export interface EditorConfig {
  features: {
    mediaLibrary: boolean
    directUpload: boolean
    urlEmbed: boolean
  }
  callbacks?: {
    onMediaInsert?: (mediaId: string, type: string) => void
    onUrlConvert?: (url: string) => void
  }
}

export function createEditorExtensions(config: EditorConfig) {
  // Automatically configure based on features
  // Cleaner, more declarative
}
```

**Benefits:**
- Declarative configuration
- Feature flags instead of component injection
- Cleaner API surface

---

## Migration Plan (Option 2)

### Phase 3A: Create Unified Media Component

**Tasks:**
1. Create `MediaPlaceholder.svelte` with:
   - Upload button + handler
   - Browse library button + handler
   - Loading state
   - UnifiedMediaModal integration
   - Props: mediaType, icon, accept, onInsert

2. Extract `useMediaInsertion` logic:
   - File validation
   - Upload API call
   - Progress tracking
   - Error handling

3. Create thin wrappers:
   - `ImagePlaceholder.svelte` (15 lines)
   - `AudioPlaceholder.svelte` (15 lines + album context)
   - `VideoPlaceholder.svelte` (15 lines)

**Estimate:** 4-6 hours

---

### Phase 3B: Update Extension Definitions

**Tasks:**
1. Update `ImageExtended.ts`, `AudioExtended.ts`, `VideoExtended.ts`:
   - Add `mediaId` attribute to all
   - Set `allowBase64: true` where needed
   - Use upstream code as base

2. Update placeholder extension definitions:
   - Wire up new unified components
   - Preserve callback options

**Estimate:** 2-3 hours

---

### Phase 3C: Preserve Custom Features

**Tasks:**
1. **Gallery extension:**
   - Keep as 100% custom
   - Update to Svelte 5 syntax
   - Use unified MediaPlaceholder if possible

2. **Audio context awareness:**
   - Keep album context logic
   - Keep pane manager integration
   - Ensure ContentInsertionPane still works

3. **EXIF data handling:**
   - Preserve EXIF extraction for images
   - Keep enhanced image placeholder

**Estimate:** 3-4 hours

---

## Success Metrics

**Code Quality:**
- [ ] Reduce media placeholder code from ~780 lines to ~145 lines (81% reduction)
- [ ] Zero code duplication across Image/Audio/Video placeholders
- [ ] All components use Svelte 5 runes properly

**Functionality:**
- [ ] Media library integration works for all types
- [ ] Direct upload works for all types
- [ ] mediaId tracking works for all types
- [ ] Album context works for Audio
- [ ] EXIF data works for Images
- [ ] Gallery management works

**Maintainability:**
- [ ] Single component to update for media UI changes
- [ ] Clear separation: extensions (logic) vs components (UI)
- [ ] Aligned with upstream patterns where possible

---

## Conclusion

**Recommendation:** **Option 2 - Hybrid Approach**

Create a unified `MediaPlaceholder` component that eliminates 81% of duplicated code while preserving all our sophisticated features (media library, uploads, tracking). This balances pragmatism with code quality, giving us:

1. **Immediate benefit:** Less code to maintain
2. **Future benefit:** Easier to add new media types
3. **Alignment:** Closer to upstream patterns
4. **Preservation:** All our custom features intact

**Total effort:** 9-13 hours (manageable for one phase)

**Risk:** Low-Medium (unified component is well-scoped, features are preserved)
