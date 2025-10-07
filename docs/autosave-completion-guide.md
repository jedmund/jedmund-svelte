# Admin Autosave Completion Guide

## Objectives
- Eliminate redundant save requests triggered on initial page load.
- Restore reliable local draft recovery, including clear-up of stale backups.
- Deliver autosave status feedback that visibly transitions back to `idle` after successful saves.
- Ensure navigation/unload flows wait for pending autosaves instead of cancelling them mid-flight.

## Key Problem Areas

### Missing Draft Handlers
- `src/routes/admin/posts/[id]/edit/+page.svelte:425` references `restoreDraft` and `dismissDraft`, but the functions are never defined. Draft recovery buttons therefore break compilation and runtime behavior.

### Immediate Autosaves on Load
- Effects in `src/routes/admin/posts/[id]/edit/+page.svelte:307` and `src/lib/components/admin/ProjectForm.svelte:157` call `autoSave.schedule()` as soon as the component mounts. Because the payload hash includes `updatedAt`, each mount triggers redundant PUTs until the server response realigns the hash.

### Ineffective Navigation Guard
- `beforeNavigate(() => autoSave.flush())` (posts + project form) does not cancel the outbound navigation, so the flush typically aborts when the route unloads. Result: unsaved work if the user navigates away during a pending autosave.

### Controller Lifecycle Gaps
- `createAutoSaveController` timers/AbortController persist after leaving the page because callers never invoke `destroy()`.
- Post editor imports `clearDraft` but never clears the draft after successful saves or when dismissing the prompt, so stale backups reappear.

## Controller Enhancements (`src/lib/admin/autoSave.ts`)
- **Baseline priming**: Add a `prime(initialPayload)` (or allow `onSaved` to pass the response payload) to set `lastSentHash` immediately after fetching server data. This prevents an automatic save when the user has not made changes.
- **Auto-idle transition**: When status becomes `'saved'`, set a timeout (e.g., 2s) that reverts status to `'idle'`. Cancel the timeout on any new state change.
- **Robust destroy**: Ensure `destroy()` clears pending timers and aborts the current request; expose and require callers to invoke it on component teardown.
- Consider optional helper flags (e.g., `autoResetStatus`) so forms do not reimplement timing logic.

## Shared Lifecycle Helper
Create a utility (e.g., `initAutoSaveLifecycle`) that accepts the controller plus configuration:
- Registers keyboard shortcut (`Cmd/Ctrl+S`) to `flush()` once the page has loaded.
- Provides a real navigation guard that cancels the navigation event, awaits `flush()`, then resumes or surfaces an error.
- Hooks into `onDestroy` to remove listeners and call `controller.destroy()`.
- Optionally wires window unload handling if needed.

## Form Integration Checklist

### Posts Editor (`src/routes/admin/posts/[id]/edit/+page.svelte`)
1. Implement `restoreDraft` / `dismissDraft` and handle `clearDraft` after autosave or manual save success.
2. Introduce a `hasLoaded` flag set after `loadPost()` (and controller `prime`) before scheduling autosave.
3. Adopt the shared lifecycle helper for navigation, keyboard shortcuts, and cleanup.

### Project Form (`src/lib/components/admin/ProjectForm.svelte`)
1. Mirror baseline priming and `hasLoaded` gating before scheduling.
2. Clear drafts on success or dismissal, and reuse the lifecycle helper.
3. Ensure autosave only starts after the initial project data populates `formData`.

### Other Forms (Simple Post, Essay, Photo, etc.)
- Audit each admin form to ensure they use the shared lifecycle helper, seed baselines, clear drafts, and transition status back to `idle`.

## Testing & Verification
- **Unit Tests**: Cover controller state transitions, baseline priming, abort handling, and auto-idle timeout (`tests/autoSaveController.test.ts`). Run with `node --test --loader tsx tests/autoSaveController.test.ts`.
- **Component Tests**: Verify autosave does not fire on initial mount, drafts restore/clear correctly, and navigation waits for flush.
- **Manual QA**: Confirm keyboard shortcut behavior, offline fallback, and that UI returns to `idle` after showing “saved”.

## Structural Considerations
- Factor shared autosave wiring into reusable modules to avoid copy/paste drift.
- Ensure server response payloads used in `prime()` reflect the canonical representation (including normalized fields) so hashes stay in sync.
- Document the lifecycle helper so new admin screens adopt the proven pattern without regression.

