# Contributing to jedmund.com

Use Node 24, matching CI, and the pnpm version pinned in `package.json`.
Install with `pnpm install --frozen-lockfile`. See the
[validation guide](docs/validation.md) for synthetic PostgreSQL/Redis setup,
environment requirements, and validation commands. The workflow in
[`.github/workflows/edra.yml`](.github/workflows/edra.yml) defines CI's environment.

## Find the owner before changing behavior

- [Cleanup opportunities](docs/codebase-cleanup-opportunities.md) records proposed
  work and its scope; historical diagnostic counts are not accepted baselines.
- [Edra customizations](docs/EDRA_CUSTOMIZATIONS.md) defines the boundary between
  vendored Edra, application-owned editor behavior, and persisted content.
- [Validation](docs/validation.md) owns development checks and their prerequisites.

Keep pure calculations and validation separate from I/O. Put reusable server
orchestration and infrastructure under `$lib/server`; route handlers translate
HTTP requests and responses. Keep database access, credentials, filesystem access,
and server configuration behind the server boundary. Validate untrusted inputs
at entrypoints: TypeScript types do not validate request JSON or provider responses.
UI capabilities never replace server authorization.

Preserve API responses, persisted identifiers, media relationships, and public
component contracts during extraction. Characterize existing behavior before
replacing an implementation. Prisma defines the desired schema; migrations
implement upgrades. Do not rewrite shipped migrations or assume an empty-database
bootstrap works: migration-history repair is tracked separately in the cleanup doc.

## Readable code and file size

Name functions for their action and values for their meaning. Prefer small
functions with one responsibility, explicit return paths, and simple data flow.
Extract repeated behavior to its owner. Avoid speculative frameworks and helpers
that merely rename an expression.

Use discriminated unions for distinct states. Prefer `unknown` and narrowing to
`any`; explain unavoidable library-boundary casts. Use `import type` for types.
Do not weaken compiler settings, revive error baselines, or add broad lint
exclusions to make a change pass.

New application-owned production files have these limits:

- Svelte components: **300 physical lines**, including script, markup, styles,
  comments, and blank lines.
- JavaScript, TypeScript, CSS, and SCSS: **500 physical lines**, including comments
  and blank lines. This includes `.svelte.ts` state modules and schema definitions.

Tests, fixtures, tooling, generated files, database migrations, and the pinned
vendored Edra snapshot are outside these limits. Application-owned editor files
under `src/lib/editor/jedmund/` remain production code and follow the limits.

Existing oversized files are adoption debt. Keep their line count at or below the
PR target branch's count and reduce it when extracting responsibilities. Do not
require an unrelated feature change to rewrite the whole component. Explain any
necessary exception in the PR, including why extraction would be worse and the
follow-up needed. Exceptions change the policy; they are not the routine fix for
an oversized file.

`pnpm lint:structure` enforces these limits with exact ceilings in
`quality-baseline.json`. Reduce a ceiling when its file shrinks; remove the entry
when the file meets the normal limit or is deleted. New or increased allowances
fail against the target branch. See [validation](docs/validation.md#file-size-gate)
for comparison references and exclusions.

Never compress code, remove useful explanations, move a component's styles into
an arbitrary file, or disguise production logic as test support to meet a limit.
Prettier owns formatting: tabs, single quotes, no semicolons or trailing commas,
and a 100-column wrapping target. Long URLs and indivisible strings may exceed it.

## Components, state, and imports

Use Svelte 5 runes. Extract a component for a coherent interaction, independently
meaningful section, or reused presentation. Extract pure calculations to ordinary
TypeScript modules and reactive resource orchestration to focused `.svelte.ts`
helpers where appropriate.

Give components narrow props and explicit callbacks. Preserve one owner for each
piece of state, request lifecycle, cancellation, focus, and loading/error/empty
state. Children receive the values and actions they need; avoid prop bags that
conceal dependencies and arbitrary `Part1`/`Part2` fragments.

For admin forms and uploaders:

- Keep form-level persistence, navigation guards, and save state with the form or
  its dedicated controller. Reuse the existing autosave helper rather than
  starting another save loop in a child component.
- Separate file validation and upload transport from drop-zone presentation,
  previews, media selection, and gallery ordering.
- Preserve callback semantics. A callback reporting newly uploaded media is not
  interchangeable with one reporting the complete gallery. Establish whether the
  parent or child owns bound-value updates before moving code.
- Preserve edits made during requests. Define what happens on partial failure,
  retry, removal, cancellation, and unmount; a shorter component is not sufficient
  if its state transitions become harder to understand.

Await or return work that callers depend on. Background work needs an intentional
lifetime and rejection handler; `void promise` does not handle rejection. Release
timers, listeners, subscriptions, object URLs, and other resources on success,
failure, and teardown. Prevent stale requests from overwriting newer state.
Errors should retain useful context without logging credentials or private media.

Import application components, functions, and types from their defining files.
Do not introduce wildcard exports or forwarding-only barrels to hide ownership.
An `index.ts` with its own implementation is valid. Use third-party packages'
supported public APIs; preserve the documented vendored Edra integration paths.
Existing import conventions can be migrated in focused changes.

## UI and styling

Use scoped `<style lang="scss">` blocks, semantic classes, and named state
classes or attributes. Reuse the variables, mixins, and theme tokens under
`src/assets/styles/`. Global resets and shared theme output belong in the existing
application styles imported by `src/app.css`; feature styles should remain scoped
to an owned component or renderer root.

Use existing spacing, typography, color, radius, and breakpoint tokens where
suitable. Add genuinely shared appearance values to the owning styles rather
than duplicating feature-local constants. Parents own layout through flex/grid,
gap, alignment, and padding. Preserve semantic tables and normal inline text flow.
Keep portal styling with the portal's implementation.

Reuse existing admin controls such as `Button`, `Input`, and `SelectField`, and
existing modal/pane primitives. Keep common variants and interaction states in
those shared components. Use the existing icon assets or Lucide icons. Preserve
accessible labels, focus indicators, keyboard operation, and focus restoration.
Set button types explicitly when extracting controls from forms; preserve native
submission and validation. Distinguish actionable errors from routine save status.

## Storybook and validation

Inspect existing stories before changing shared UI. Add or update representative
stories when introducing a reusable component or changing its props, meaningful
states, appearance, interactions, or accessibility. Internal parts may be covered
through their public composition. Purely internal extraction with unchanged
observable behavior does not require duplicate stories.

Use the scripts that exist in `package.json`:

| Command                              | Purpose                                                |
| ------------------------------------ | ------------------------------------------------------ |
| `pnpm exec prettier --write <paths>` | Format only changed files                              |
| `pnpm check`                         | Svelte and TypeScript checking                         |
| `pnpm lint:eslint`                   | Code diagnostics                                       |
| `pnpm lint:format`                   | Formatting check                                       |
| `pnpm lint:structure`                | File-size limits and shrinking allowances              |
| `pnpm lint:unused`                   | Confirmed unused files (Knip comprehensive analysis)   |
| `pnpm audit:unused`                  | Production reachability report for review              |
| `pnpm lint`                          | All four lint checks, reporting every result           |
| `pnpm test`                          | Unit/integration tests and editor fixture verification |
| `pnpm build`                         | Production application build                           |
| `pnpm build-storybook`               | Component documentation build                          |

Run focused checks during development and the relevant full checks before
merging. Documentation-only changes need link, formatting, and diff review, not
application tests. Markdown is currently excluded from the aggregate formatting
check; review it explicitly. Report what ran, what passed, and any limitations.
Do not claim skipped database tests are equivalent to the full suite.

Test behavior at component, HTTP, persistence, and provider boundaries. Cover
rejection, partial failure, cancellation, recovery, stale responses, and
authorization where relevant. Use disposable synthetic databases and filesystem
roots. Do not add tests for formatting or implementation trivia. Browser checks
should verify behavior and accessibility; review visual changes in context.

The pinned `src/lib/components/edra/` snapshot has its own formatting ownership.
Keep application changes in `src/lib/editor/jedmund/` and composer wrappers.
Follow the documented fixture, renderer, media-reference, and corpus procedure
when changing persisted editor schemas. Never commit private corpus artifacts,
backups, credentials, or production data.

## Commits and pull requests

Keep PRs focused and independently valid. Describe the concrete behavior change,
compatibility considerations, affected stories, and validation. Base independent
work on current `origin/main`. For stacked PRs, make the dependency explicit and
recheck the target after the parent merges; merging into an old feature branch
does not land its changes on main.

Opening a PR, merging it, and deploying are separate actions. Keep commit messages
and PR descriptions about the project changes, without assistant attribution.
