# Task 3: Project Form Modularization & Store Extraction

## Overview

Refactor `ProjectForm.svelte` (currently ~719 lines) to use composable stores and reusable helpers, reducing duplication and improving testability.

## Current State Analysis

### ✅ Already Modularized
- **Section components exist**:
  - `ProjectMetadataForm.svelte`
  - `ProjectBrandingForm.svelte`
  - `ProjectImagesForm.svelte`
  - `ProjectStylingForm.svelte`
  - `ProjectGalleryForm.svelte`
- **Autosave integrated**: Uses `createAutoSaveStore` from Task 6

### ❌ Needs Extraction
- **No store abstraction**: All form state lives directly in the component (~50 lines of state declarations)
- **Draft recovery scattered**: Manual logic spread across multiple `$effect` blocks (~80 lines)
- **Navigation guards duplicated**: `beforeNavigate`, `beforeunload`, Cmd+S shortcuts (~90 lines total)
- **Form lifecycle boilerplate**: Initial load, populate, validation (~60 lines)

### Issues with Current Approach
1. **Not reusable**: Same patterns will be copy-pasted to PostForm, EssayForm, etc.
2. **Hard to test**: Logic is tightly coupled to component lifecycle
3. **Unclear boundaries**: Business logic mixed with UI orchestration
4. **Maintenance burden**: Bug fixes need to be applied to multiple forms

## Proposed Architecture

### 1. Create Store Factory: `src/lib/stores/project-form.svelte.ts`

**Purpose**: Centralize form state management and validation logic.

**API Design**:
```typescript
export function createProjectFormStore(project?: Project) {
  // Internal state
  const fields = $state<ProjectFormData>({ ...defaultProjectFormData })
  const validationErrors = $state<Record<string, string>>({})
  const isDirty = $derived(/* compare fields to original */)

  return {
    // Read-only derived state
    fields: readonly fields,
    validationErrors: readonly validationErrors,
    isDirty,

    // Actions
    setField(key: keyof ProjectFormData, value: any): void
    setFields(data: Partial<ProjectFormData>): void
    validate(): boolean
    reset(): void
    populateFromProject(project: Project): void
    buildPayload(): ProjectPayload
  }
}

export type ProjectFormStore = ReturnType<typeof createProjectFormStore>
```

**Benefits**:
- Type-safe field access with autocomplete
- Centralized validation logic
- Easy to unit test
- Can be used standalone (e.g., in tests, other components)

### 2. Create Draft Recovery Helper: `src/lib/admin/useDraftRecovery.svelte.ts`

**Purpose**: Extract draft restore prompt logic for reuse across all forms.

**API Design**:
```typescript
export function useDraftRecovery<TPayload>(options: {
  draftKey: string | null
  onRestore: (payload: TPayload) => void
  enabled?: boolean
}) {
  const showPrompt = $state(false)
  const draftTimestamp = $state<number | null>(null)
  const timeTicker = $state(0)
  const draftTimeText = $derived.by(() =>
    draftTimestamp ? (timeTicker, timeAgo(draftTimestamp)) : null
  )

  // Auto-detect draft on mount
  $effect(() => { /* ... */ })

  // Update time display every minute
  $effect(() => { /* ... */ })

  return {
    showPrompt: readonly showPrompt,
    draftTimeText,
    restore(): void
    dismiss(): void
  }
}
```

**Usage**:
```svelte
<script>
const draftRecovery = useDraftRecovery({
  draftKey: draftKey,
  onRestore: (payload) => formStore.setFields(payload)
})
</script>

{#if draftRecovery.showPrompt}
  <DraftPrompt
    timeAgo={draftRecovery.draftTimeText}
    onRestore={draftRecovery.restore}
    onDismiss={draftRecovery.dismiss}
  />
{/if}
```

**Benefits**:
- Reusable across ProjectForm, PostForm, EssayForm, etc.
- Encapsulates timing and state management
- Easy to test in isolation

### 3. Create Form Guards Helper: `src/lib/admin/useFormGuards.svelte.ts`

**Purpose**: Extract navigation protection logic.

**API Design**:
```typescript
export function useFormGuards(autoSave: AutoSaveStore | null) {
  // Navigation guard: flush before route change
  beforeNavigate(async (navigation) => { /* ... */ })

  // Browser close warning
  $effect(() => { /* addEventListener('beforeunload') */ })

  // Cmd/Ctrl+S shortcut
  $effect(() => { /* addEventListener('keydown') */ })

  // No return value - purely side effects
}
```

**Usage**:
```svelte
<script>
useFormGuards(autoSave)
</script>
```

**Benefits**:
- Single source of truth for form protection
- Consistent UX across all forms
- Easier to update behavior globally

### 4. Simplify ProjectForm.svelte

**Before**: ~719 lines
**After**: ~200-300 lines

**New structure**:
```svelte
<script lang="ts">
  import { createProjectFormStore } from '$lib/stores/project-form.svelte'
  import { useDraftRecovery } from '$lib/admin/useDraftRecovery.svelte'
  import { useFormGuards } from '$lib/admin/useFormGuards.svelte'
  import { createAutoSaveStore } from '$lib/admin/autoSave.svelte'

  // Props
  let { project = null, mode }: Props = $props()

  // Create store
  const formStore = createProjectFormStore(project)

  // Autosave
  const autoSave = mode === 'edit'
    ? createAutoSaveStore({ /* ... */ })
    : null

  // Draft recovery
  const draftRecovery = useDraftRecovery({
    draftKey: makeDraftKey('project', project?.id),
    onRestore: (payload) => formStore.setFields(payload)
  })

  // Guards (navigation, beforeunload, Cmd+S)
  useFormGuards(autoSave)

  // UI state
  let activeTab = $state('metadata')

  // Trigger autosave on changes
  $effect(() => {
    formStore.fields; activeTab
    if (hasLoaded && autoSave) autoSave.schedule()
  })
</script>

<AdminPage>
  <!-- Header with save actions -->
  <!-- Tab controls -->

  {#if activeTab === 'metadata'}
    <ProjectMetadataForm bind:formData={formStore.fields} />
  {:else if activeTab === 'case-study'}
    <Composer bind:content={formStore.fields.caseStudyContent} />
  {/if}
</AdminPage>
```

## Implementation Steps

### Phase 1: Create Store Factory
1. Create `src/lib/stores/project-form.svelte.ts`
2. Extract state, validation, and field mutation logic
3. Add unit tests for store
4. Export TypeScript types

### Phase 2: Create Reusable Helpers
1. Create `src/lib/admin/useDraftRecovery.svelte.ts`
2. Create `src/lib/admin/useFormGuards.svelte.ts`
3. Document usage patterns

### Phase 3: Refactor ProjectForm
1. Update `ProjectForm.svelte` to use new store and helpers
2. Remove duplicated logic
3. Test create/edit flows
4. Test autosave, draft recovery, navigation guards

### Phase 4: Extract Draft Prompt UI
1. Create `DraftPrompt.svelte` component
2. Update ProjectForm to use it
3. Will be reusable by other forms

## Testing Strategy

### Unit Tests
- `project-form.svelte.ts`: Field updates, validation, payload building
- `useDraftRecovery.svelte.ts`: Draft detection, restore, dismiss
- Can use Vitest for rune-based stores

### Integration Tests
- Full form lifecycle: load → edit → save
- Draft recovery flow
- Navigation guard behavior
- Autosave coordination

### Manual QA
- Create new project
- Edit existing project
- Restore from draft
- Navigate away with unsaved changes
- Browser refresh warning
- Cmd+S immediate save

## Success Criteria

- [ ] ProjectForm.svelte reduced to <350 lines
- [ ] Store factory fully typed with generics
- [ ] Draft recovery reusable across forms
- [ ] Navigation guards work consistently
- [ ] All existing functionality preserved
- [ ] Unit tests pass
- [ ] Manual QA checklist completed

## Future Work (Post-Task 3)

Once this pattern is proven with ProjectForm:

1. **Apply to PostForm** (essays, posts)
2. **Apply to MediaForm** (photo editing)
3. **Extract common form shell** (header, tabs, actions) into `FormShell.svelte`
4. **Add form-level error boundaries** for graceful failure handling

## Dependencies

- ✅ Task 6 (Autosave Store) - already complete
- ✅ Existing section components - already built
- ⏳ Need to ensure TypeScript strict mode compliance

## Related Documents

- [Admin Modernization Plan](./admin-modernization-plan.md)
- [Task 6 Autosave Plan](./task-6-autosave-store-plan.md)
- [Autosave Completion Guide](./autosave-completion-guide.md)
