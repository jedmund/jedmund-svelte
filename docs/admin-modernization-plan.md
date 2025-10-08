# Admin Interface Modernization Plan

## Progress Overview

**Current Status:** Phase 2 Complete ✅ (3 of 4 phases done)

- ✅ **Phase 0:** Runed integration (Task 0)
- ✅ **Phase 1:** Auth & data foundation (Tasks 1, 2)
- ✅ **Phase 2:** Form modernization (Tasks 3, 6)
- 🔄 **Phase 3:** List utilities & primitives (Tasks 4, 5) - **NEXT**
- 📋 **Phase 4:** Styling harmonization (Task 7)

**Recent Completion:** Task 3 - Project Form Modularization (Oct 7, 2025)
- Reduced ProjectForm from 720 → 417 lines (42%)
- Created reusable composable stores and helpers
- Manual QA complete

---

## Goals
- Deliver an admin surface that uses idiomatic Svelte 5 + Runes with first-class TypeScript.
- Replace client-side authentication fallbacks with server-validated sessions and consistent typing.
- Reduce duplication across resource screens (projects, posts, media) by extracting reusable list, form, and dropdown primitives.
- Improve reliability by centralizing data loading, mutation, and invalidation logic.

## Guiding Principles
- Prefer `+layout.server.ts`/`+page.server.ts` with typed `load` results over `onMount` fetches; use `satisfies` clauses for strong typing.
- Use Svelte runes (`$derived`, `$state`, `$effect`) inside components, but push cross-route state into stores or `load` data.
- Model mutations as form `actions` (with optional `enhance`) to avoid bespoke `fetch` calls and to keep optimistic UI localized.
- Encode shared behaviors (filters, dropdowns, autosave) as reusable helpers or actions so we can verify and test them once.
- Annotate shared helpers with explicit generics, exported types, and narrow `ReturnType` helpers for downstream safety.
- Leverage the [Runed](https://runed.dev) utility library where it meaningfully reduces rune boilerplate while keeping bundle size in check.

---

## Task 0 – Adopt Runed Utility Layer

**Objective:** Introduce Runed as a shared dependency for rune-focused utilities, formalize usage boundaries, and pilot it in list/data flows.

### Steps
1. Add the dependency: `pnpm add runed` (or equivalent) and ensure type declarations are available to the TypeScript compiler.
2. Create `src/lib/runed/README.md` documenting approved utilities (e.g., `asyncState`, `memo`, `taskQueue`, `clickOutside`) and guidelines for contributions.
3. Establish a thin wrapper export in `src/lib/runed/index.ts` so future refactors can swap implementations without touching call sites.
4. Update Task 2 prototype (projects list) to replace manual async state handling with `resource` and memoized filters via `$derived` helpers.
5. Evaluate bundle impact via `pnpm run build` and record findings in the doc, adjusting the allowed utility list if necessary.

**Current Adoption:** Projects index page now uses `resource` for data fetching and `onClickOutside` for dropdowns as the pilot integration.

### Implementation Notes
- Prefer wrapping Runed utilities so downstream components import from a single local module (`import { asyncState } from '$lib/runed'`).
- Pair Runed helpers with `satisfies` clauses to keep returned state strongly typed.
- Audit for tree-shaking compliance; Runed utilities are individually exported to support dead code elimination.

### Dependencies
- None; execute before Task 1 to unlock downstream usage.

---

## Task 1 – Server-Side Authentication & Session Flow

**Objective:** Move credential validation out of the browser and expose typed session data to all admin routes.

### Steps
1. Create `src/routes/admin/+layout.server.ts` that:
   - Reads an HttpOnly cookie (e.g., `admin_session`).
   - Validates credentials via shared server utility (reusable by API routes).
   - Returns `{ user }` (or `null`) while throwing `redirect(303, '/admin/login')` for unauthenticated requests.
2. Add `src/routes/admin/login/+page.server.ts` with:
   - A `load` that returns any flash errors.
   - A default `actions` export that validates the submitted password, sets the cookie via `cookies.set`, and `redirect`s into `/admin`.
3. Update `src/routes/admin/+layout.svelte` to:
   - Remove `onMount`, `$page` derived auth checks, and `goto` usage.
   - Read the session via `const { user } = await parent()` and gate rendering accordingly.
   - Handle the login route by checking `data` from parent rather than client state.
4. Replace all `localStorage.getItem('admin_auth')` references (e.g., `Admin API`, media page) with reliance on server session (see Task 2).

### Implementation Notes
- Use `LayoutServerLoad` typing: `export const load = (async (event) => { ... }) satisfies LayoutServerLoad;`.
- Define a `SessionUser` type in `src/lib/types/session.ts` to share across routes and endpoint handlers.
- For Basic auth compatibility during transition, consider reading the existing header and issuing the new cookie so legacy API calls keep working.

### Dependencies
- Requires shared credential validation utility (see Task 2 Step 1).
- Requires infra support for HttpOnly cookie (name, maxAge, secure flag).

---

## Task 2 – Unified Data Fetching & Mutation Pipeline

**Objective:** Standardize how admin pages load data and mutate resources with TypeScript-checked flows.

### Steps
1. Extract a server helper `src/lib/server/admin/authenticated-fetch.ts` that wraps `event.fetch`, injects auth headers if needed, and narrows error handling.
2. Convert project, post, media list routes to use server loads:
   - Add `+page.server.ts` returning `{ items, filters }` with `depends('admin:projects')`-style cache keys.
   - Update `+page.svelte` files to read `export let data` and derive view state from `data.items`.
   - Use `$derived` to compute filtered lists inside the component rather than re-fetching.
3. Replace manual `fetch` calls for mutations with typed form actions:
   - Define actions in `+page.server.ts` (`export const actions = { toggleStatus: async (event) => { ... } }`).
   - In Svelte, use `<form use:enhance>` or `form` wrappers to submit with `fetch`, reading `event.detail.result`.
4. After successful mutations, call `invalidate('admin:projects')` (client side) or return `invalidate` instructions within actions to refresh data.

### Implementation Notes
- Leverage `type ProjectListData = Awaited<ReturnType<typeof load>>` for consumer typing.
- Use discriminated union responses from actions (`{ type: 'success'; payload: ... } | { type: 'error'; message: string }`).
- For media pagination, accept `url.searchParams` in the server load and return `pagination` metadata for the UI.

### Dependencies
- Requires Task 1 cookie/session handling.
- Coordinate with API endpoint typing to avoid duplicating DTO definitions (reuse from `src/lib/schemas/...`).

---

## Task 3 – Project Form Modularization & Store Extraction ✅

**Status:** ✅ **COMPLETED** (Oct 7, 2025) - Commit `34a3e37`

**Objective:** Split `ProjectForm.svelte` into composable, typed stores and view modules.

### Implementation Summary
Created reusable form patterns following Svelte 5 best practices:

**New Files:**
- `src/lib/stores/project-form.svelte.ts` (114 lines) - Store factory with `$state`, `$derived`, validation
- `src/lib/admin/useDraftRecovery.svelte.ts` (62 lines) - Generic draft restoration with auto-detection
- `src/lib/admin/useFormGuards.svelte.ts` (56 lines) - Navigation guards, beforeunload, Cmd+S shortcuts
- `src/lib/components/admin/DraftPrompt.svelte` (92 lines) - Reusable draft prompt UI component

**Refactored:**
- `src/lib/components/admin/ProjectForm.svelte` - Reduced from 720 → 417 lines (42% reduction)

### Key Achievements
- All form state centralized in composable store
- Draft recovery, navigation guards fully extracted and reusable
- Type-safe with full generic support (`useDraftRecovery<TPayload>`)
- Patterns ready for PostForm, MediaForm, etc.
- Build passes, manual QA complete

### Implementation Notes
- State returned directly from factories (no `readonly` wrappers needed in Svelte 5)
- Used `$state`, `$derived`, `$effect` runes throughout
- Store factory uses `z.infer<typeof projectSchema>` for type alignment
- Exported `type ProjectFormStore = ReturnType<typeof createProjectFormStore>` for downstream usage

### Dependencies
- ✅ Task 2 (data fetching) - complete
- ✅ Task 6 (autosave store) - complete

---

## Task 4 – Shared List Filtering Utilities

**Objective:** Remove duplicated filter/sort code across projects, posts, and media.

### Steps
1. Introduce `src/lib/admin/listFilters.ts` providing `createListFilters<T>(items, config)` that returns:
   - Rune-backed state stores for selected filters (`$state`),
   - `$derived` filtered/sorted output,
   - Helpers `setFilter`, `reset`, and computed counts.
2. Define filter configuration types using generics (`FilterConfig<T, K extends keyof T>` etc.) for compile-time safety.
3. Update each admin list page to:
   - Import the helper, pass initial data from the server load, and drive the UI from the returned stores.
   - Replace manual event handlers with `filters.set('status', value)` style interactions.
4. Add lightweight unit tests (Vitest) for the utility to confirm sort stability and predicate correctness.

### Implementation Notes
- Use `export interface ListFiltersResult<T>` to codify the return signature.
- Provide optional `serializer` hooks for search params so UI state can round-trip URL query strings.

### Dependencies
- Task 2 ensures initial data arrives via server load.

---

## Task 5 – Dropdown, Modal, and Click-Outside Primitives

**Objective:** Centralize interaction patterns to reduce ad-hoc document listeners.

### Steps
1. Create `src/lib/actions/clickOutside.ts` that dispatches a `custom:event` when the user clicks outside an element; write in TypeScript with generics for event detail types.
2. Replace manual `document.addEventListener` usages in `ProjectListItem`, `PostListItem`, media dropdowns with `use:clickOutside` and component-local state.
3. Evolve `BaseDropdown.svelte` into `Dropdown.svelte` + `DropdownTrigger.svelte` + `DropdownMenu.svelte` components backed by a shared store (manages open state, keyboard navigation).
4. Standardize action buttons to use `<button type="button">` and move repeated SVG markup into icon components (`src/lib/icons`).

### Implementation Notes
- Ensure dropdown components accept slots typed via `Snippet` and expose `export type DropdownContext` for advanced use cases.
- Add focus-trap support with optional dependency on `@floating-ui/dom` if necessary, wrapped in a utility to keep types consistent.

### Dependencies
- No external dependencies beyond existing component imports; can be implemented incrementally per list.

---

## Task 6 – Autosave Store & Draft Persistence ✅

**Status:** ✅ **COMPLETED** (Earlier in Phase 2)

**Objective:** Turn autosave logic into a typed store for reuse across forms.

### Implementation Summary
Created `src/lib/admin/autoSave.svelte.ts` with:
- Generic `createAutoSaveStore<TPayload, TResponse>(options)` factory
- Reactive status using `$state<AutoSaveStatus>`
- Methods: `schedule()`, `flush()`, `destroy()`, `prime()`
- Debounced saves with abort controller support
- Online/offline detection with automatic retry
- Draft persistence fallback when offline

**Documented in:** `docs/autosave-completion-guide.md`

### Key Features
- Fully typed with TypeScript generics
- Integrates with `draftStore.ts` for localStorage fallback
- Used successfully in refactored ProjectForm
- Reusable across all admin forms

### Implementation Notes
- Returns reactive `$state` for status tracking
- Accepts `onSaved` callback with `prime()` helper for baseline updates
- Handles concurrent saves with abort controller
- Automatically transitions from 'saved' → 'idle' after delay

### Dependencies
- ✅ Task 2 (mutation endpoints) - complete

---

## Task 7 – Styling & Theming Harmonization

**Objective:** Reduce SCSS duplication and make layout adjustments easier.

### Steps
1. Create `src/lib/styles/admin.css` exposing CSS variables for spacing, typography, and colors consumed by admin components.
2. Replace per-component `@import '$styles/variables.scss'` with `@use` in a single scoped stylesheet or with CSS variable access.
3. Introduce layout wrappers (e.g., `AdminLayoutShell.svelte`) that centralize container widths and card backgrounds, removing repeated SCSS from `AdminPage`, `AdminNavBar`, etc.
4. Audit component classes to ensure consistent BEM-ish naming and remove redundant selectors (e.g., duplicate `.loading` styles across pages).

### Implementation Notes
- Consider PostCSS or Svelte’s `<style global>` for variable declarations; keep component styles scoped.
- Document variable names and usage in a short appendix within this doc once finalized.

### Dependencies
- Largely independent; best executed after structural refactors to avoid churn.

---

## Rollout Strategy

### ✅ Phase 0: Runed Integration (Complete)
- ✅ Task 0: Runed utility layer integrated and documented
- Projects index page using `resource` for data fetching
- `onClickOutside` implemented for dropdowns

### ✅ Phase 1: Auth & Data Foundation (Complete)
- ✅ Task 1: Server-side authentication with session flow
- ✅ Task 2: Unified data fetching & mutation pipeline
- HttpOnly cookie authentication working
- Server loads with typed `satisfies` clauses

### ✅ Phase 2: Form Modernization (Complete)
- ✅ Task 6: Autosave store with draft persistence
- ✅ Task 3: Project form modularization with composable stores
- Reduced ProjectForm from 720 → 417 lines (42%)
- Reusable patterns ready for other forms

### 🔄 Phase 3: List Utilities & Primitives (Next)
- ⏳ Task 4: Shared list filtering utilities
- ⏳ Task 5: Dropdown, modal, and click-outside primitives

### 📋 Phase 4: Styling Harmonization (Future)
- ⏳ Task 7: Styling & theming cleanup

---

Each task section above can serve as a standalone issue. Ensure QA includes regression passes for projects, posts, and media operations after every phase.
