# Task 6: Autosave Store Implementation Plan

## Goal
Modernize autosave to use Svelte 5 runes while fixing existing bugs. Ensure data integrity through incremental implementation with validation points.

---

## Overview

**Current State:**
- `createAutoSaveController()` uses manual subscriptions (Svelte 4 pattern)
- Works in ProjectForm and partially in posts editor
- Has known bugs: autosaves on load, broken navigation guard, status doesn't reset to idle

**Target State:**
- `createAutoSaveStore()` using Svelte 5 `$state()` runes
- Fixes known bugs (prime baseline, auto-idle, navigation guard)
- Clean API: `autoSave.status` instead of `autoSave.status.subscribe(...)`
- Reusable across all admin forms

---

## Implementation Steps

### Step 1: Add Missing Features to Current Controller
**Why first:** Existing tests already expect these features. Fix bugs before converting to runes.

**Changes to `src/lib/admin/autoSave.ts`:**
- Add `prime(payload)` method to set initial hash baseline (prevents autosave on load)
- Add `idleResetMs` option for auto-transition: 'saved' → 'idle' (default 2000ms)
- Enhance `onSaved` callback to receive `{ prime }` helper for re-priming after server response

**Validation:**
```bash
node --test --loader tsx tests/autoSaveController.test.ts
```
All 3 tests should pass.

**Quick Manual Test:**
- Open browser console on ProjectForm
- Verify no PUT request fires on initial load
- Make an edit, verify save triggers after 2s

---

### Step 2: Convert to Runes-Based Store
**Why separate:** Proves the rune conversion without complicating Step 1's bug fixes.

**Changes:**
1. Rename: `src/lib/admin/autoSave.ts` → `src/lib/admin/autoSave.svelte.ts`
2. Replace manual subscriptions with rune-based state:
   ```typescript
   let status = $state<AutoSaveStatus>('idle')
   let lastError = $state<string | null>(null)

   return {
     get status() { return status },
     get lastError() { return lastError },
     schedule,
     flush,
     destroy,
     prime
   }
   ```
3. Export types: `AutoSaveStore`, `AutoSaveStoreOptions`

**Validation:**
```bash
npm run check  # Should pass (ignore pre-existing errors)
```

Create minimal test component:
```svelte
<script>
  import { createAutoSaveStore } from '$lib/admin/autoSave.svelte'
  const store = createAutoSaveStore({ ... })
</script>

<div>Status: {store.status}</div>
```
Verify status updates reactively without manual subscription.

---

### Step 3: Update ProjectForm (Pilot)
**Why ProjectForm first:** It's the most complex form. If it works here, others will be easier.

**Changes to `src/lib/components/admin/ProjectForm.svelte`:**
1. Import new store: `import { createAutoSaveStore } from '$lib/admin/autoSave.svelte'`
2. Remove subscription code (if any exists)
3. Add `hasLoaded` flag:
   ```typescript
   let hasLoaded = $state(false)
   ```
4. After `populateFormData()` completes:
   ```typescript
   formData = { ...loadedData }
   autoSave?.prime(buildPayload())
   hasLoaded = true
   ```
5. Update `$effect` that schedules autosave:
   ```typescript
   $effect(() => {
     formData  // establish dependency
     if (mode === 'edit' && hasLoaded && autoSave) {
       autoSave.schedule()
       if (draftKey) saveDraft(draftKey, buildPayload())
     }
   })
   ```
6. Use lifecycle helper (if not already):
   ```typescript
   import { initAutoSaveLifecycle } from '$lib/admin/autoSaveLifecycle'

   if (mode === 'edit' && autoSave) {
     initAutoSaveLifecycle(autoSave, {
       isReady: () => hasLoaded,
       onFlushError: (error) => console.error('Autosave flush failed:', error)
     })
   }
   ```

**Critical Validation Checklist:**
- [ ] Open existing project → no autosave fires
- [ ] Edit title → autosave triggers after 2s
- [ ] Status shows: idle → saving → saved → idle
- [ ] Make edit, navigate away → save completes first
- [ ] Press Cmd/Ctrl+S → immediate save
- [ ] Make edit, refresh page → draft prompt appears
- [ ] Restore draft, make manual save → draft clears

**Debugging:**
- Network tab: Watch for PUT requests to `/api/projects/{id}`
- Console: Add `console.log('Saving:', payload)` in save function
- Console: Add `console.log('Status:', store.status)` to watch transitions

---

### Step 4: Update Posts Editor
**Apply same pattern to `src/routes/admin/posts/[id]/edit/+page.svelte`**

Key differences:
- Simpler structure (no case study)
- Add missing `restoreDraft()` and `dismissDraft()` functions (currently referenced but not defined)

**Validation:** Same checklist as ProjectForm

---

### Step 5: Update Remaining Forms (Optional)
If EssayForm, PhotoPostForm, SimplePostForm use autosave, apply same pattern.

**Validation:** Quick smoke test (edit, save, verify no errors)

---

### Step 6: Update Tests & Cleanup
1. Rename test file: `tests/autoSaveController.test.ts` → `tests/autoSaveStore.test.ts`
2. Update imports in test file
3. Run tests: `node --test --loader tsx tests/autoSaveStore.test.ts`
4. Update `docs/autosave-completion-guide.md` to reflect new API

---

## Data Integrity Safeguards

### Hash-Based Deduplication
✓ Only saves when payload changes (via JSON hash comparison)

### Concurrency Control
✓ `updatedAt` field prevents overwriting newer server data

### Request Cancellation
✓ AbortController cancels in-flight requests when new save triggered

### Navigation Guard
✓ Waits for flush to complete before allowing route change

### Draft Recovery
✓ localStorage backup in case of crash/accidental navigation

---

## Rollback Strategy

**If issues in Step 1:** Revert `autoSave.ts` changes
**If issues in Step 2:** Keep Step 1 fixes, revert rune conversion
**If issues in Step 3:** Only ProjectForm affected, other forms unchanged
**If issues in Step 4+:** Revert individual forms independently

---

## Success Criteria

- ✅ No autosaves on initial page load
- ✅ Saves trigger correctly on edits (2s debounce)
- ✅ Status indicator cycles properly (idle → saving → saved → idle)
- ✅ Navigation guard prevents data loss
- ✅ Draft recovery works reliably
- ✅ All unit tests pass
- ✅ Zero duplicate save requests
- ✅ Manual QA checklist passes

---

## Notes

- Keep old `autoSave.ts` until all forms migrate (backward compatibility)
- Test with slow network (Chrome DevTools → Network → Slow 3G)
- Test offline mode (DevTools → Network → Offline)
- Each step is independently testable
- Stop at any step if issues arise
