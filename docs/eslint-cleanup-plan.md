# ESLint Cleanup Plan

**Status:** 613 errors → Target: 0 errors
**Generated:** 2025-11-23

## Executive Summary

The codebase currently has 613 ESLint errors across 180 files. This document provides a systematic approach to eliminate all errors, organized by priority and error type.

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

### Phase 1: Critical Blockers (6 errors) 🔴

**Priority:** CRITICAL - These prevent proper linting of affected files

**Parsing Errors to Fix:**
- `src/routes/+layout.svelte:33` - Parsing error
- `routes/albums/[slug]/+page.svelte:140` - Parsing error
- `routes/labs/[slug]/+page.svelte:77` - Parsing error
- `routes/photos/[id]/+page.svelte:361` - Parsing error
- `routes/universe/[slug]/+page.svelte:85` - Parsing error
- `routes/work/[slug]/+page.svelte:115` - Parsing error

**Action:** Investigate and fix TypeScript/Svelte syntax issues in these route files.

### Phase 2: Low-Hanging Fruit (148 errors) 🟢

**Priority:** HIGH - Automatically fixable, quick wins

**Auto-fixable errors:**
- 139 unused imports/variables (`@typescript-eslint/no-unused-vars`)
- 7 `prefer-const` violations
- 2 empty blocks (`no-empty`)

**Action:** Run `npx eslint . --fix`

**Expected Result:** Reduces error count by ~24% with zero risk.

### Phase 3: Type Safety (277 errors) 🟡

**Priority:** HIGH - Improves code quality and type safety

Replace `any` types with proper TypeScript types, organized by subsystem:

#### Batch 1: Admin Components (~50 errors in 11 files)
- AdminFilters.svelte
- AdminHeader.svelte
- AdminNavBar.svelte
- AlbumForm.svelte
- AlbumListItem.svelte
- EssayForm.svelte
- FormField.svelte
- GalleryUploader.svelte
- SimplePostForm.svelte
- PhotoPostForm.svelte
- ProjectForm.svelte

#### Batch 2: API Routes (~80 errors in 20 files)
- `/api/admin/*` endpoints
- `/api/lastfm/*` endpoints
- `/api/media/*` endpoints
- `/api/posts/*` endpoints
- `/api/universe/*` endpoints
- `/rss/*` endpoints

#### Batch 3: Frontend Components (~70 errors in 30 files)
- AppleMusicSearchModal.svelte
- DebugPanel.svelte
- DynamicPostContent.svelte
- GeoCard.svelte
- PhotoMetadata.svelte
- ProjectPasswordProtection.svelte
- UniverseCard.svelte
- Other frontend components

#### Batch 4: Server Utilities (~40 errors in 20 files)
- `lib/server/apple-music-client.ts`
- `lib/server/logger.ts` (10 errors)
- `lib/utils/metadata.ts` (10 errors)
- `lib/utils/content.ts`
- Other server utilities

#### Batch 5: Remaining Files (~37 errors in 18 files)
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

- **Phase 1 Complete:** No parsing errors
- **Phase 2 Complete:** ~465 errors remaining (25% reduction)
- **Phase 3 Complete:** ~188 errors remaining (69% reduction)
- **Phase 4 Complete:** ~79 errors remaining (87% reduction)
- **Phase 5 Complete:** 0 errors (100% clean)

## Notes

- Prettier formatting issues (93 files) are separate from ESLint and should be fixed with `npm run format`
- Sass `@import` deprecation warnings are informational only and don't count toward the 613 errors
- Some `{@html}` warnings may be acceptable if content is trusted/sanitized

---

**Last Updated:** 2025-11-23
**Next Review:** After Phase 1 completion
