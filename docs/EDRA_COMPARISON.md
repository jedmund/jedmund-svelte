# Edra Upstream Comparison Analysis

**Date:** 2026-02-06
**Current Version:** ~2.x (vendored, pre-2.4.0)
**Upstream Version:** 2.4.0
**Purpose:** Document all differences between current and upstream Edra

---

## File Structure Differences

### Files Only in Current (Custom Additions)

**Root Level:**
- `drag-handle.svelte` - Custom drag handle component
- `editor-extensions.ts` - Our extension configuration system with callbacks
- `tooltip.scss` - Custom tooltip styling

**Extensions:**
- `extensions/SmilieReplacer.ts` - **CUSTOM** - 130+ emoticon conversions
- `extensions/FontSize.ts` - **CUSTOM** - Font size increase/decrease commands
- `extensions/gallery/GalleryPlaceholder.ts` - Custom gallery placeholder
- `extensions/gallery/GalleryExtended.ts` - Custom gallery implementation

**Other:**
- Custom modifications to media extension placeholders (Audio, Video, Image)
- Custom slash command groups

### Files Only in Upstream (New Features)

**Root Level:**
- `strings.ts` - Centralized string management (NEW)
- `types.ts` - Centralized type definitions (NEW)
- `components/` directory - UI component library (NEW)

**Extensions:**
- `extensions/HandleFileDrop.ts` - File drop handling (NEW)
- `extensions/InlineMathReplacer.ts` - Math notation autocomplete (NEW)
- `extensions/table/table-header.ts` - Separate table header extension (NEW)
- `extensions/table/table-cell.ts` - Separate table cell extension (NEW)
- `extensions/table/table-row.ts` - Separate table row extension (NEW)

**Headless Components:**
- More comprehensive headless component library

### Files in Both (Need Merge Analysis)

**Core Files:**
- `editor.ts` - Main editor initialization
- `editor.css` - Editor styles
- `utils.ts` - Utility functions
- `svelte-renderer.ts` - Svelte component renderer
- `onedark.css` - Code theme

**Extensions:**
- `extensions/ColorHighlighter.ts` - Same in both (upstream adopted it!)
- `extensions/FindAndReplace.ts` - Same in both (upstream adopted it!)
- `extensions/audio/` - Need to merge our placeholder customizations
- `extensions/video/` - Need to merge our placeholder customizations
- `extensions/image/` - Need to merge our placeholder customizations
- `extensions/iframe/` - Need to merge our customizations
- `extensions/slash-command/` - Need to merge our command groups
- `extensions/table/` - Need to merge our customizations

---

## Key Findings

### ✅ Good News: Upstream Adopted Our Extensions!

Upstream Edra now includes:
- `ColorHighlighter.ts` - Identical to our version
- `FindAndReplace.ts` - Nearly identical (just formatting differences)

This means we DON'T need to manually copy these - they're already in upstream!

### 📋 Custom Extensions Still Needed (2 instead of 4)

We only need to copy:
1. **SmilieReplacer.ts** - Emoticon conversions
2. **FontSize.ts** - Font size commands

ColorHighlighter and FindAndReplace are already in upstream 2.4.0!

### 🆕 New Upstream Features

**Centralized String Management (`strings.ts`)**
- All UI strings in one place
- Internationalization-ready
- Better maintainability

**Centralized Type Definitions (`types.ts`)**
- Common types exported from one location
- Better type safety
- Easier to maintain

**UI Component Library (`components/`)**
- Dialog, Textarea, Separator, Command, Tabs components
- Consistent UI patterns
- Reusable across extensions

**Improved Table Extensions**
- Separate extensions for table-header, table-cell, table-row
- Better modularity
- More flexible configuration

**Math Features**
- `InlineMathReplacer.ts` - Auto-converts math notation (e.g., `->` to →)
- Improved math editing experience

**File Drop Handling**
- `HandleFileDrop.ts` - Better drag-and-drop file support
- Integrates with media extensions

---

## Dependency Updates

Upstream requires these TipTap packages (from initialization output):

```
@tiptap/core
@tiptap/extension-code-block-lowlight
@tiptap/extension-highlight
@tiptap/extension-image
@tiptap/extension-subscript
@tiptap/extension-superscript
@tiptap/extension-table
@tiptap/extension-text-align
@tiptap/extension-text-style
@tiptap/extension-typography
@tiptap/pm
@tiptap/starter-kit
@tiptap/suggestion
@tiptap/extensions
@tiptap/extension-list
@tiptap/extension-bubble-menu
@tiptap/markdown
@tiptap/extension-mathematics
@tiptap/extension-table-of-contents
@floating-ui/dom
katex
lowlight
svelte-tiptap
tiptap-extension-auto-joiner
@lucide/svelte
```

**New dependencies vs current:**
- `@tiptap/extension-table-of-contents` - NEW (Table of Contents feature)
- `@tiptap/extension-list` - May be new
- `@tiptap/extension-bubble-menu` - May be new
- `@tiptap/markdown` - May be new
- `@lucide/svelte` - NEW icon library

---

## Migration Strategy Adjustments

Based on this analysis, we can simplify our migration:

### Phase 1: Catalog & Reinitialize ✓
- [x] Document customizations
- [x] Create comparison analysis
- [ ] Backup current Edra
- [ ] Copy upstream to project
- [ ] Update dependencies

### Phase 2: Migrate Custom Extensions (SIMPLIFIED!)
Only need to copy 2 extensions instead of 4:
- [ ] Copy SmilieReplacer.ts
- [ ] Copy FontSize.ts
- ~~ColorHighlighter~~ Already in upstream ✓
- ~~FindAndReplace~~ Already in upstream ✓

### Phase 3: Merge Enhanced Extensions
- [ ] Merge media extension enhancements (Audio, Video, Image)
- [ ] Merge gallery extension
- [ ] Merge slash command groups
- [ ] Merge table customizations
- [ ] Merge iframe customizations

### Phase 4: Restore Integration Layer
- [ ] Update editor-extensions.ts (our callback system)
- [ ] Update drag-handle.svelte
- [ ] Update ComposerCore.svelte
- [ ] Update ComposerToolbar.svelte
- [ ] Update ComposerMediaHandler.ts
- [ ] Update content rendering utilities

### Phase 5: Evaluate New Features
- [ ] Test Table of Contents
- [ ] Test InlineMathReplacer
- [ ] Test HandleFileDrop
- [ ] Evaluate new UI components

---

## Risk Assessment Update

**Risk Reduced:** Upstream adopted 2 of our 4 custom extensions, which means:
- ✅ Less code to migrate manually
- ✅ Our extensions are validated by upstream
- ✅ Type fixes already applied to ColorHighlighter and FindAndReplace
- ✅ Better long-term maintainability

**Remaining Risks:**
- Medium: Merging media extension customizations
- Medium: Restoring editor-extensions.ts callback system
- Low: Updating integration layer (Composer system)
- Low: Copying SmilieReplacer and FontSize

---

## Next Steps

1. Backup current Edra to `src/lib/components/edra-backup/`
2. Copy upstream Edra to `src/lib/components/edra/`
3. Update package.json dependencies
4. Begin Phase 2 (only 2 custom extensions to copy!)
