# Edra Customizations Catalog

This document catalogs all customizations made to the vendored Edra rich text editor at `/src/lib/components/edra/`.

## ✅ Update Complete (February 2026)

**Final State:**
- Edra version: 2.4.0 (fresh from upstream)
- TipTap version: 2.27.2
- All custom extensions: ✅ Migrated and working
- All enhanced extensions: ✅ Integrated
- Integration layer: ✅ Updated and compatible
- Audio upload support: ✅ Added
- Status: Ready for production

**Original State (Pre-Update):**
- Edra version: ~2.x (vendored, pre-2.4.0)
- TipTap version: 2.12.0
- Type errors: 64 (mostly ProseMirror type conflicts)

---

## Custom Extensions (Keep 100%)

These extensions are entirely custom and do not exist in upstream Edra. They must be preserved completely.

### 1. SmilieReplacer (`extensions/SmilieReplacer.ts`)

**Purpose:** Converts 130+ ASCII emoticons to emojis in real-time

**Examples:**
- `:)` → 🙂
- `<3` → ❤️
- `/shrug` → ¯\\\_(ツ)\_/¯

**Implementation:** Uses TipTap's `textInputRule` system

**Dependencies:** None

**Status:** Must copy to new baseline

---

### 2. ColorHighlighter (`extensions/ColorHighlighter.ts`)

**Purpose:** Detects hex colors in text and renders color swatches inline

**Examples:**
- `#ff0000` → shows red swatch
- `#RGB` and `#RRGGBB` formats supported

**Implementation:** Uses ProseMirror decorations

**Dependencies:**
- `findColors` utility in `utils.ts`

**Status:** Must copy to new baseline + ensure `findColors` utility exists

---

### 3. FontSize (`extensions/FontSize.ts`)

**Purpose:** Provides increase/decrease font size commands

**Implementation:** Extends TipTap's TextStyle mark

**Dependencies:** None

**Status:** Must copy to new baseline

---

### 4. FindAndReplace (`extensions/FindAndReplace.ts`)

**Purpose:** Full search & replace functionality with highlighting

**Features:**
- Regex support
- Case sensitivity toggle
- Navigation between matches
- Replace all

**License:** MIT (from sereneinserenade)

**Dependencies:** None

**Status:** Must copy to new baseline

---

## Enhanced Upstream Extensions (Merge Modifications)

These extensions exist in upstream Edra but have significant customizations that must be merged.

### 1. Media Extensions (Audio, Video, Image, Gallery)

**Files:**
- `extensions/audio/`
- `extensions/video/`
- `extensions/image/`
- `extensions/gallery/`

**Customizations:**
- Custom placeholder components with enhanced UI/UX
- Media library integration via `UnifiedMediaModal.svelte`
- Enhanced drag-and-drop zones
- EXIF data display for images
- Custom upload callbacks

**Strategy:** Compare with upstream, merge our placeholder components and media library integration

---

### 2. URL Embed Extension

**File:** `extensions/url-embed/`

**Customizations:**
- Metadata fetching and preview display
- Conversion dropdown UI
- `onShowDropdown` callback for integration with our media library
- Enhanced error handling

**Strategy:** Merge our metadata fetching logic and callback system into upstream version

---

### 3. Geolocation Extension

**File:** `extensions/geolocation/`

**Customizations:**
- Leaflet map integration
- Custom map popup UI
- Map placeholder component
- Custom location search

**Strategy:** Preserve Leaflet integration and custom UI components

---

### 4. Link Context Menu

**File:** Extensions related to link handling

**Customizations:**
- Custom right-click behavior
- `onShowContextMenu` callback
- Integration with our link manager

**Strategy:** Preserve callback system and custom menu behavior

---

### 5. Drag Handle

**File:** `extensions/drag-handle/`

**Customizations:**
- Custom clipboard serialization
- Enhanced block manipulation
- Custom drag preview

**Strategy:** Merge our serialization logic into upstream version

---

### 6. Table Extensions

**Files:**
- `extensions/table/`
- Related table components

**Customizations:**
- Custom table/cell/header/row implementations
- Row/column context menus
- Custom table styling

**Strategy:** Evaluate if upstream has improved tables; if so, use theirs and add our menus; otherwise keep our implementations

---

### 7. Slash Commands

**File:** `extensions/slash-command/` or similar

**Customizations:**
- Custom command grouping (text, media, advanced, etc.)
- Custom component list
- Integration with our command configuration system

**Strategy:** Preserve our command groups and component list structure

---

## Integration Layer (Restore After)

These files sit outside the vendored Edra code but integrate with it. They must be updated to work with the new Edra version.

### Composer System

**Location:** `/src/lib/components/admin/composer/`

**Files:**
- `ComposerCore.svelte` - Main editor wrapper with variant system (full/inline/minimal)
- `ComposerToolbar.svelte` - Custom toolbar with grouped commands
- `ComposerMediaHandler.ts` - Media library integration logic
- `editorConfig.ts` - Command configuration and grouping

**Status:** Update import paths and API calls to work with new Edra

---

### Extension Configuration

**File:** `editor-extensions.ts` (or equivalent in upstream)

**Customizations:**
- `EditorExtensionOptions` interface with callback parameters
- `getEditorExtensions()` function with callback support
- `EDITOR_PRESETS` for variant system (full/inline/minimal)

**Status:** Merge our callback system into upstream's extension configuration

---

### Content Rendering

**Location:** `/src/lib/utils/content.ts`

**Functions:**
- `renderEdraContent()` - Renders saved editor content for display
- `getContentExcerpt()` - Extracts plain text excerpt from content

**Status:** Ensure compatibility with new Edra's output format

---

### Headless Components

**Location:** `edra/headless/` (if customized)

**Custom Components:**
- `EnhancedImagePlaceholder.svelte` - Custom image placeholder with upload progress
- Any other custom UI components

**Status:** Compare with upstream and merge our enhancements

---

## Upstream Features (New in 2.4.0)

Features we'll get automatically by reinitializing:

- ✅ Latest TipTap (2.27.2) - performance, security, bug fixes
- ✅ All type fixes - zero ProseMirror type conflicts
- ✅ Math editing improvements - better placeholders, rendering
- ✅ Tooltip styling - better keyboard shortcut display
- ✅ Code formatting standardization - cleaner codebase
- ✅ Selection capture fixes - better cursor behavior
- ✅ UI component updates - polished interfaces

Features to evaluate:

- ⚠️ Table of Contents component - evaluate if useful for our content types
- ⚠️ New UI components (Dialog, Textarea, Separator, Command, Tabs) - evaluate selectively

---

## Migration Checklist

### Phase 1: Catalog & Reinitialize ✓
- [x] Create this customizations catalog
- [ ] Create comparison analysis
- [ ] Initialize fresh Edra 2.4.0 baseline
- [ ] Update TipTap dependencies

### Phase 2: Migrate Custom Extensions
- [ ] Copy SmilieReplacer.ts
- [ ] Copy ColorHighlighter.ts + findColors utility
- [ ] Copy FontSize.ts
- [ ] Copy FindAndReplace.ts
- [ ] Register all custom extensions
- [ ] Test each extension

### Phase 3: Merge Enhanced Extensions
- [ ] Merge media extension enhancements
- [ ] Merge URL embed enhancements
- [ ] Merge geolocation enhancements
- [ ] Merge link context menu enhancements
- [ ] Merge drag handle enhancements
- [ ] Merge table enhancements
- [ ] Merge slash command enhancements

### Phase 4: Restore Integration Layer
- [ ] Update editor extension configuration
- [ ] Update editor initialization
- [ ] Update ComposerCore.svelte
- [ ] Update ComposerToolbar.svelte
- [ ] Update ComposerMediaHandler.ts
- [ ] Update content rendering utilities
- [ ] Restore custom headless components

### Phase 5: New Upstream Features
- [ ] Evaluate Table of Contents
- [ ] Evaluate new UI components
- [ ] Document decisions

### Phase 6: Testing & Cleanup
- [ ] Test all custom extensions
- [ ] Test all media extensions
- [ ] Test all advanced features
- [ ] Test all editor variants
- [ ] Test integration points
- [ ] Remove backup files

---

## Notes

**Reinitialize Command:**
```bash
npx edra@next init headless
```

**Backup Location:**
Moved to `src/lib/components/edra-backup/` before reinitializing

**Documentation Updates:**
This file will be updated throughout the migration to track progress and decisions.
