# Codebase cleanup opportunities

Reviewed September 24, 2026. Priorities agreed September 26, 2026.

The main opportunity is to finish adopting existing shared patterns and make development checks trustworthy. The first cleanup PR restores green type checking and linting. The remaining opportunities are follow-up work.

## First PR: green type checking and linting (implemented)

The review found 191 Svelte check errors and 32 warnings, plus 89 ESLint errors and six warnings, using the installed dependencies. The existing [type-check gate](../scripts/check-edra-types.ts) permits a baseline of 86 historical errors.

Proposed scope:

- Verify dependency alignment and reproduce diagnostics with a frozen-lockfile installation before treating all reported errors as source defects.
- Fix shared causes first: 62 diagnostics came from untyped Garden search results in `src/lib/constants/garden.ts`.
- Investigate editor command/type mismatches, then address remaining application and story types without weakening strictness or broadly suppressing diagnostics.
- Fix lint and formatting failures while preserving behavior, especially form save paths and Svelte reactivity.
- Separate formatting and ESLint commands so a formatting failure does not prevent ESLint from running; keep an aggregate lint command.
- Make CI enforce the full type, formatting, and lint checks. Retire the historical type-error allowance once the full check passes.

Acceptance criteria:

- `pnpm check` and `pnpm lint` exit successfully with no type or lint errors.
- Remaining non-failing warnings, if any, are explicitly reviewed and documented.
- `pnpm test` and `pnpm build` pass in the configured validation environment.
- CI enforces the green checks without accepting historical type errors.

Keep larger component refactors, migration repairs, and unrelated behavior changes in subsequent PRs.

## Implementation results

- Full type checking passes with zero errors; seven existing CSS warnings remain documented in [the validation guide](./validation.md).
- ESLint and formatting pass. Independent commands and an aggregate lint runner report both checks.
- The historical 86-error allowance is removed; `check:edra` is now an alias for full checking.
- CI requires the full checks and retains database/editor verification, plus application and Storybook builds.
- All 35 tests pass with the synthetic local database; five fixture documents and eight database corpus documents pass editor verification.
- Browser smoke checks cover login, Project edits during the first save, Garden in-flight edits and saved-draft reload, Album creation/editing, media attachment, and metadata text/date/toggle/tag bindings.
- The upstream Edra tree and dependency lockfile remain unchanged. Vendored Edra stays type-checked and tested, with lint/format policy following its upstream ownership.

Storybook validation also repaired an unregistered Album story and outdated Sass import paths. Broader setup, API, and component cleanup remain follow-up work.

The [codebase health ledger](codebase-health.md) tracks the current unused-file audit,
all 56 starting size allowances, and the ordered responsibility-cleanup waves.

## Follow-up opportunities

### 1. Make fresh setup reliable

[LOCAL_SETUP.md](../LOCAL_SETUP.md) describes Node 18+, port 5173, and Basic Auth. At review time the package required Node 20+, Vite used port 5175, and admin authentication used sessions. README and setup commands also use npm despite the pinned pnpm package manager.

More significantly, [CI](../.github/workflows/edra.yml) uses `prisma db push` because historical migrations assume an existing schema.

- Establish and test an empty-database bootstrap with synthetic seed data.
- Reconcile migration history through an explicit baseline strategy that preserves existing deployments.
- Provide one authoritative pnpm setup guide with consistent runtime, environment, authentication, and port instructions.

Benefit: less onboarding guesswork and less dependence on copying production data.

### 2. Finish standardizing API calls and validation

The shared [API client](../src/lib/admin/api.ts) throws a generic “Request failed,” while forms such as AlbumForm independently parse server error messages. Post creation consumes raw JSON, and pagination helpers allow invalid strings to become `NaN`.

- Preserve the server's documented error contract in the shared client and migrate remaining callers.
- Validate request bodies at server boundaries using shared schemas where appropriate.
- Validate pagination inputs and return predictable errors or defaults.

Benefit: more consistent behavior and easier diagnosis of failed requests.

### 3. Extract behavior from large admin components

At review time, GalleryUploader was 1,037 lines, ImageUploader 816, and GardenItemForm 771. Image and gallery uploaders repeat file validation, drag/drop, upload, and media-library selection behavior.

- Extract shared upload behavior and focused UI components.
- Consolidate repeated autosave status labels and navigation handling around the existing autosave helper.
- Split components by responsibility rather than arbitrary line-count targets.

Benefit: smaller changes, fewer duplicated fixes, and easier reasoning about form state.

First implementation: retire the unreferenced `GalleryUploader`, `GalleryManager`,
`ProjectGalleryForm`, and `ProjectImagesForm` components (1,918 lines). The active
project branding form uses `ImageUploader`; it now composes focused drop-zone,
preview, and description components with independently tested upload/metadata
sessions. Upload failure/teardown releases timers, same-file selection can retry,
and serialized description saves preserve in-flight edits and reject stale responses.
All resulting production components meet the normal file-size limits. Remaining
large forms and shared autosave presentation remain follow-up work.

### 4. Clarify server ownership and remove obsolete implementations

Redis lives in `src/routes/api/redis-client.ts`, so server utilities import infrastructure from the routes directory. The older Last.fm stream manager/detector pair appeared unreferenced while the “simple” implementations were active.

- Move Redis infrastructure under `$lib/server` and centralize its connection lifecycle.
- Verify references and remove the obsolete Last.fm pair if confirmed unused.

Benefit: clearer module boundaries and less ambiguity about which implementation to extend.

### 5. Extend tests to everyday CMS workflows

Existing tests provide useful editor and schema coverage. Add coverage for login, draft creation, autosave conflicts, publishing, and media attachment/removal before substantial form refactors.

Benefit: confidence that cleanup preserves important editing workflows.

## Boundaries to preserve

The two editor trees have deliberate [upstream/application ownership](./EDRA_CUSTOMIZATIONS.md). Apparent duplication alone is not a reason to merge them. Persisted editor schemas are data contracts; follow the documented fixture, renderer, media-scanner, and corpus verification procedure when changing them.

## Review validation and limitations

- Svelte check: 191 errors and 32 warnings across 52 files.
- ESLint: 89 errors and six warnings; this was a direct ESLint run, not the full formatting-plus-lint command.
- Unit tests: 29 passed, one database test skipped.
- Checks used installed binaries because the pnpm launcher encountered a sandbox write restriction.
- A fresh installation and production build were not verified during the review.

These counts are a snapshot, not a new accepted diagnostic baseline. Reproduce them before implementation.
