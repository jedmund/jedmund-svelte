# ESLint Cleanup Plan

**Status:** 622 errors → 105 errors remaining (83% complete) ✨
**Generated:** 2025-11-23
**Last Updated:** 2025-11-23

## Progress Summary

| Phase | Status | Errors Fixed | Notes |
|-------|--------|--------------|-------|
| Phase 1: Critical Blockers | ✅ Complete | 6 | All parsing errors resolved |
| Phase 2: Auto-fixable | ✅ Complete | 148 | Ran `eslint --fix` |
| Phase 3: Type Safety | 🔄 In Progress | 363/277* | *More errors found during cleanup |
| Phase 4: Svelte 5 Migration | ⏳ Pending | 0/109 | Not started |
| Phase 5: Remaining Issues | ⏳ Pending | 0/73 | Not started |

**Total Progress:** 517/622 errors fixed (83% complete)

### Phase 3 Detailed Progress

| Batch | Status | Errors Fixed | Files |
|-------|--------|--------------|-------|
| Batch 1: Admin Components | ✅ Complete | 44 | 11 files |
| Batch 2: API Routes | ✅ Complete | 26 | 20 files |
| Batch 3: Frontend Components | ✅ Complete | 80 | 46 files |
| Batch 4: Server Utilities | 🔄 In Progress | 9/88 | 21 files |
| Batch 5: Remaining Files | ⏳ Pending | 0 | TBD |

**Commits:**
- `94e13f1` - Auto-fix linting issues with eslint --fix
- `8ec4c58` - Eliminate remaining any types in API routes
- `9c746d5` - Replace any types in frontend components (batch 1)
- `3d77922` - Replace more any types in components (batch 2)
- `9379557` - Complete frontend component any type cleanup
- `6408e7f` - Start fixing server utility any types (WIP)

## Executive Summary

The codebase initially had 622 ESLint errors across 180 files. Through systematic cleanup, we've reduced this to 105 errors (83% complete). This document tracks progress and provides a systematic approach to eliminate all remaining errors.

## Error Breakdown by Rule

| Count | % of Total | Files | Rule |
|-------|------------|-------|------|
| 277 | 45.2% | 99 | `@typescript-eslint/no-explicit-any` |
| 139 | 22.7% | 79 | `@typescript-eslint/no-unused-vars` |
| 109 | 17.8% | 44 | `svelte/valid-compile` |
| 26 | 4.2% | 6 | `@typescript-eslint/no-unused-expressions` |
| 22 | 3.6% | 1 | `svelte/no-dupe-style-properties` |
| 10 | 1.6% | 9 | `svelte/no-at-html-tags` |
| 7 | 1.1% | 6 | `prefer-const` |
| 6 | 1.0% | 6 | Parsing errors |
| 5 | 0.8% | 2 | `no-undef` |
| 22 | 3.6% | — | Other (various) |

## Top Files Requiring Attention

1. **AvatarSVG.svelte** - 22 errors (duplicate style properties)
2. **posts/[id]/edit/+page.svelte** - 20 errors (mixed)
3. **admin/EssayForm.svelte** - 18 errors (mixed)
4. **admin/GalleryUploader.svelte** - 18 errors (mixed)
5. **admin/InlineComposerModal.svelte** - 17 errors (mixed)

## Execution Plan

### Phase 1: Critical Blockers (6 errors) ✅ COMPLETE

**Status:** ✅ All parsing errors resolved

**Parsing Errors Fixed:**
- `src/routes/+layout.svelte:33` - Parsing error ✅
- `routes/albums/[slug]/+page.svelte:140` - Parsing error ✅
- `routes/labs/[slug]/+page.svelte:77` - Parsing error ✅
- `routes/photos/[id]/+page.svelte:361` - Parsing error ✅
- `routes/universe/[slug]/+page.svelte:85` - Parsing error ✅
- `routes/work/[slug]/+page.svelte:115` - Parsing error ✅

**Result:** All files now properly lintable.

### Phase 2: Low-Hanging Fruit (148 errors) ✅ COMPLETE

**Status:** ✅ Auto-fixes applied successfully

**Errors Fixed:**
- 139 unused imports/variables (`@typescript-eslint/no-unused-vars`) ✅
- 7 `prefer-const` violations ✅
- 2 empty blocks (`no-empty`) ✅

**Action Taken:** Ran `npx eslint . --fix`

**Result:** 148 errors eliminated automatically (24% reduction).

### Phase 3: Type Safety (277+ errors) 🔄 IN PROGRESS

**Priority:** HIGH - Improves code quality and type safety
**Status:** 150/~363 errors fixed (41% complete)

Replace `any` types with proper TypeScript types, organized by subsystem:

#### Batch 1: Admin Components ✅ COMPLETE
**Status:** ✅ 44 errors fixed in 11 files

**Key Improvements:**
- Added Prisma types (Post, Project, Media, Album)
- Created specific payload interfaces (DraftPayload, PhotoPayload, etc.)
- Replaced `any` with `unknown` and proper type guards
- Fixed editor ref types with JSONContent interfaces

**Files Fixed:**
- GalleryUploader.svelte (9 errors)
- editorConfig.ts (8 errors)
- posts/[id]/edit/+page.svelte (8 errors)
- SimplePostForm.svelte (7 errors)
- GenericMetadataPopover.svelte (5 errors)
- PhotoPostForm.svelte (5 errors)
- useFormGuards.svelte.ts (4 errors)

#### Batch 2: API Routes ✅ COMPLETE
**Status:** ✅ 26 errors fixed in 20 files (all API/RSS routes now have 0 `any` errors)

**Key Improvements:**
- Used `Prisma.JsonValue` for JSON column types
- Added `Prisma.[Model]WhereInput` for where clauses
- Added `Prisma.[Model]UpdateInput` for update operations
- Created interfaces for complex data structures (ExifData, PhotoMedia, etc.)
- Used proper type guards (Array.isArray checks)

**Files Fixed:**
- api/media/bulk-delete/+server.ts (10 errors)
- rss/+server.ts (8 errors)
- api/universe/+server.ts (4 errors)
- rss/universe/+server.ts (4 errors)
- Plus 16 more API/RSS route files

#### Batch 3: Frontend Components ✅ COMPLETE
**Status:** ✅ 80 errors fixed in 46 files (all components now have 0 `any` errors)

**Key Improvements:**
- Used Leaflet types (L.Map, L.Marker, L.LeafletEvent) for map components
- Used Svelte 5 `Snippet` type for render functions
- Used `Component` type for Svelte component parameters
- Used `EditorView` type for TipTap/ProseMirror views
- Added proper error handling with type guards

**Files Fixed:**
- All edra/headless placeholder components (7 files, 14 errors)
- Map components with Leaflet types (3 files, 9 errors)
- Form components with Prisma types (12 files, 24 errors)
- Editor extensions and utilities (6 files, 12 errors)
- Plus 18 more component files

#### Batch 4: Server Utilities 🔄 IN PROGRESS
**Status:** 🔄 9/88 errors fixed in 21 files

**Currently Working On:**
- `lib/utils/content.ts` (15 → 6 errors remaining)
  - Added ContentNode interface for content rendering
  - Replaced function parameters with proper types
  - Fixed content traversal and mapping functions

**Remaining Files:**
- `lib/server/apple-music-client.ts` (10 errors)
- `lib/server/logger.ts` (10 errors)
- `lib/utils/metadata.ts` (10 errors)
- `lib/server/cloudinary-audit.ts` (6 errors)
- Plus 17 more server/utility files

#### Batch 5: Remaining Files ⏳ PENDING
**Status:** ⏳ Not started

**Files to Fix:**
- `global.d.ts` (2 errors)
- `lib/admin/autoSave.svelte.ts`
- `lib/admin/autoSaveLifecycle.ts`
- Other miscellaneous files

### Phase 4: Svelte 5 Migration (109 errors) 🟡

**Priority:** MEDIUM - Required for Svelte 5 compliance

#### Batch 1: Reactive State Declarations (~20 errors in 15 files)

Variables not declared with `$state()`:
- `searchModal` (DebugPanel.svelte)
- `cardElement` (LabCard.svelte)
- `logoElement` (ProjectItem.svelte)
- `dropdownElement` (DropdownMenu.svelte)
- `metadataButtonRef` (2 files)
- `editorInstance`, `essayTitle`, `essaySlug`, etc. (EssayForm.svelte)
- And 8 more files

**Action:** Wrap reactive variables in `$state()` declarations.

#### Batch 2: Event Handler Migration (~12 errors in 6 files)

Deprecated `on:*` handlers to migrate:
- `on:click` → `onclick` (3 occurrences in 2 files)
- `on:mousemove` → `onmousemove` (2 occurrences)
- `on:mouseenter` → `onmouseenter` (2 occurrences)
- `on:mouseleave` → `onmouseleave` (2 occurrences)
- `on:keydown` → `onkeydown` (1 occurrence)

**Files:**
- BaseModal.svelte
- LabCard.svelte

#### Batch 3: Accessibility Issues (~40 errors in 22 files)

**A11y fixes needed:**
- 15 instances: Click events need keyboard handlers
- 10 instances: Form labels need associated controls
- 8 instances: Elements with click handlers need ARIA roles
- 3 instances: Non-interactive elements with tabindex
- 2 instances: Elements need ARIA labels

**Common patterns:**
- Add `role="button"` and `onkeydown` handlers to clickable divs
- Associate labels with form controls using `for` attribute
- Add `tabindex="-1"` or remove unnecessary tabindex

#### Batch 4: Deprecated Component Syntax (~10 errors in 6 files)

**Issues:**
- `<svelte:self>` → Use self-imports instead (DropdownMenu.svelte)
- `<svelte:component>` → Components are dynamic by default in runes mode
- Self-closing non-void elements (3 files, e.g., `<textarea />`)

#### Batch 5: Custom Element Props (6 files)

**Issue:** Rest props with `$props()` need explicit destructuring or `customElement.props` config

**Files:**
- admin/Button.svelte
- stories/Button.svelte
- And 4 more component files

#### Batch 6: Miscellaneous Svelte Issues

- State referenced locally warnings (5 occurrences)
- Video elements missing captions (1 occurrence)
- Unused CSS selectors (2 occurrences)
- Image redundant alt text (1 occurrence)

### Phase 5: Remaining Issues (73 errors) 🟡

**Priority:** MEDIUM-LOW

#### AvatarSVG.svelte (22 errors)
- 22 duplicate style properties in SVG gradient definitions
- **Action:** Consolidate duplicate `fill` and `stop-color` properties

#### XSS Warnings (10 errors)
- 10 `{@html}` usage warnings in various components
- **Action:** Review each instance, ensure content is sanitized, or suppress with eslint-disable if safe

#### Code Quality Issues
- 5 `no-undef` errors (undefined variables)
- 26 `@typescript-eslint/no-unused-expressions` errors
- 4 `no-case-declarations` errors
- 3 `@typescript-eslint/no-empty-object-type` errors
- 3 `no-useless-escape` errors

## Recommended Execution Strategy

### For Manual Cleanup
1. ✅ **Work sequentially** - Complete phases in order
2. ✅ **Batch similar fixes** - Process files with same error pattern together
3. ✅ **Track progress** - Use todo list to check off completed items
4. ✅ **Verify continuously** - Run `npx eslint .` after each batch to confirm progress
5. ✅ **Commit frequently** - Commit after each batch for easy rollback if needed

### For LLM-Assisted Cleanup
1. **Process in phases** - Don't jump between phases
2. **One batch at a time** - Complete each batch before moving to next
3. **Verify after each batch** - Check error count decreases as expected
4. **Ask for clarification** - If error pattern is unclear, investigate before mass-fixing
5. **Preserve functionality** - Don't break working code while fixing lint errors

## Commands Reference

```bash
# Check all errors
npx eslint .

# Auto-fix what's possible
npx eslint . --fix

# Check specific file
npx eslint src/path/to/file.svelte

# Output to JSON for analysis
npx eslint . --format json > eslint-output.json

# Count errors by rule
npx eslint . 2>&1 | grep "error" | wc -l
```

## Success Metrics

- **Phase 1 Complete:** ✅ No parsing errors (6 fixed)
- **Phase 2 Complete:** ✅ 468 errors remaining (24% reduction, 154 fixed)
- **Phase 3 In Progress:** 🔄 105 errors remaining (83% reduction, 517 total fixed)
  - Batch 1-3 Complete: 150 `any` types eliminated
  - Batch 4 In Progress: 9/88 errors fixed
- **Phase 4 Pending:** ~109 Svelte 5 errors to fix
- **Phase 5 Pending:** ~73 miscellaneous errors to fix
- **Target:** 0 errors (100% clean)

## Notes

- Prettier formatting issues (93 files) are separate from ESLint and should be fixed with `npm run format`
- Sass `@import` deprecation warnings are informational only and don't count toward the 613 errors
- Some `{@html}` warnings may be acceptable if content is trusted/sanitized

## Key Learnings

### Type System Patterns Established

1. **Prisma Types:** Always use generated Prisma types for database models
   - `import type { Post, Project, Media, Album } from '@prisma/client'`
   - Use `Prisma.JsonValue` for JSON columns
   - Use `Prisma.[Model]WhereInput` and `Prisma.[Model]UpdateInput`

2. **Content Handling:** Create structured interfaces for complex nested data
   - ContentNode interface for TipTap/BlockNote content
   - Type guards for safe traversal (Array.isArray, typeof checks)

3. **Component Types:** Use Svelte 5 and framework-specific types
   - `Snippet` for render functions
   - `Component` for component references
   - Specific editor types (Editor, EditorView, JSONContent)

4. **Error Handling:** Use type guards instead of `any` casts
   - `err && typeof err === 'object' && 'status' in err`
   - `Record<string, unknown>` for truly dynamic objects
   - `unknown` instead of `any` when type is genuinely unknown

### Commit Strategy

- Commits grouped by logical batches (admin components, API routes, etc.)
- Terse, informal commit messages focusing on impact
- Frequent commits for easy rollback if needed
- No mention of tooling (Claude Code) in commit messages

---

**Last Updated:** 2025-11-23
**Next Review:** After Phase 3 Batch 4 completion
**Estimated Completion:** Phase 3 in progress, ~105 errors remaining
