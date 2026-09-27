# Development validation

Use Node 24 (matching CI) and the `pnpm@10.15.1` version pinned in `package.json`.
Install with `pnpm install --frozen-lockfile`; postinstall generates the Prisma client.
Do not diagnose editor command errors against stale dependencies: the locked TipTap
version is 3.28.0 throughout the dependency graph.

## Commands and gates

- `pnpm check`: sync SvelteKit and type-check all application, story, test, and vendored editor sources. Zero errors required.
- `pnpm check:edra`: compatibility alias for the full check. There is no historical error allowance.
- `pnpm lint:eslint`: ESLint for application-owned sources, scripts, tests, and stories.
- `pnpm lint:format`: Prettier check using the existing formatting configuration.
- `pnpm lint:structure`: production file-size limits and shrinking allowances.
- `pnpm lint`: runs all three lint checks, reports every output, and fails if any fails.
- `pnpm test`: unit and integration tests followed by synthetic editor schema verification.
- `pnpm build`: production application build.
- `pnpm build-storybook`: component documentation build.

CI reports type checking, ESLint, formatting, and file size separately, even if another quality
step fails. It also runs the tests, synthetic database corpus round-trip, and both builds.

## Scope of checks

The pinned `src/lib/components/edra/` snapshot is excluded from local ESLint and
Prettier rules to keep upstream updates diffable. It remains fully type-checked,
built, and covered by editor/schema regression tests. Application-owned editor code
under `src/lib/editor/jedmund/` and the composer wrappers receives all checks.

Generated build output, corpus artifacts, and the local pnpm store are excluded from
lint/format checks. Existing Markdown and lockfile formatting exclusions remain.
Do not add source exclusions or diagnostic baselines to hide new errors.

## File-size gate

Svelte production files may contain at most 300 physical lines; JavaScript,
TypeScript (including `.svelte.ts`), CSS, and SCSS may contain at most 500. Blank
lines and comments count. A final newline does not add an extra line.

The gate inventories tracked and untracked, non-ignored files under `src/`.
It excludes vendored Edra, `src/stories/`, `.stories.*`, `.test.*`, `.spec.*`,
`.testSupport.*`, and the `fixtures`, `__fixtures__`, `__tests__`, and `testing`
directories. Generated SvelteKit/build output, tooling, and database migrations
live outside `src/`. Application-owned editor files and API routes named `test`
remain checked. Do not place production code in excluded locations.

`quality-baseline.json` records exact ceilings for existing oversized files.
After an extraction, lower the affected ceiling to the new physical line count,
or remove it if the file now meets its normal limit or was deleted. Do not
regenerate the inventory to accept regressions. New or increased allowances fail.

Locally, comparison defaults to `origin/main`; run `git fetch origin` first.
For an explicit dependency branch, use
`QUALITY_BASE_REF=origin/<branch> pnpm lint:structure`. CI compares against the
PR base SHA or the previous push SHA, with `origin/main` for a branch's initial
push. Missing references fail with a fetch/override hint. On initial adoption,
allowances may only cover files already oversized at the comparison commit.

## Database and build environment

Use synthetic local data for validation. The CI workflow shows the authoritative
PostgreSQL 16 / Redis 7 setup and synthetic environment variables. It provisions an
empty database with `prisma db push` because migration-history repair is a separate task.

Set `DATABASE_URL`, `TEST_DATABASE_URL`, `REDIS_URL`, `ADMIN_PASSWORD`, and
`ADMIN_SESSION_SECRET` explicitly. Builds also need a synthetic `GIANTBOMB_API_KEY`
because that legacy route constructs its client during route analysis. Keep third-party
integration credentials unset during synthetic browser checks.

Database tests require a loopback database named `jedmund_edra_test_*`; the CI seed
script specifically requires `jedmund_edra_test_ci`. Match PostgreSQL client tools to
the test server major version so dumps do not emit unsupported settings. When
`TEST_DATABASE_URL` is absent, the database tests are skipped; this is not equivalent
to the full CI validation.

## Non-failing warnings

The cleanup retains seven Svelte-check CSS warnings across three files:

- Four existing `y` property warnings in `UniverseCard.svelte`.
- Two existing `line-clamp` compatibility warnings in `SocialPreviewCard.svelte`.
- One existing `line-clamp` compatibility warning on the Garden detail page.

These existing styles are preserved. Warnings are not suppressed or converted into
accepted error baselines. Builds also report existing Svelte snapshot/NodeView compiler warnings. Tooling
reports browser-data freshness, Sass/dependency deprecations, and bundle-size notices; dependency and CSS modernization are follow-up work.

## Cleanup verification (September 26, 2026)

The frozen-lockfile installation completed with unchanged dependency versions.
Full type checking reports zero errors and the seven CSS warnings listed above;
ESLint and Prettier pass. All 35 tests pass with database tests enabled. The editor
verifier passes five synthetic fixtures and eight database corpus documents,
including persisted round-trips that roll back their changes. Application and
Storybook builds pass.

Browser smoke checks used an isolated synthetic database and blocked external
browser requests. They covered login, Project first-save edits, Garden in-flight
edits (explicitly flushed with Cmd+S) and reload, Album creation/edit initialization,
media attachment, and metadata text/date/toggle/tag bindings. The unused generic
metadata component was mounted through a temporary harness removed after testing.
No production data or credentials were used. These were smoke checks, not a new
permanent browser test suite.

## Admin uploader cleanup verification (September 27, 2026)

The file-size gate starts with 59 exact allowances. Removing the unused gallery
components and extracting ImageUploader reduces that to 56. ImageUploader is
225 lines; its private Svelte components are 56–177 lines. Tests, request helpers,
and state controllers have separate ownership rather than moving styles solely
to satisfy a line count.

Full type checking passes with zero errors and the same seven CSS warnings.
All three lint checks pass. All 56 tests pass with the synthetic database enabled
(no skips), including five size-gate tests and twelve uploader regression tests.
Six editor fixtures verify successfully; application and Storybook builds pass.

Chromium smoke checks against built Storybook cover standard/compact empty and
populated states, upload progress, failed replacement, and keyboard-visible
preview controls. Synthetic application checks cover real local logo/featured-image
uploads, same-file retry, serialized description saves, edits during requests,
clearing descriptions, retained drafts after failures, keyboard file selection,
library selection, and project save/reload/removal. External browser requests were
blocked. Desktop and narrow-screen rendering were inspected. These remain focused
smoke checks rather than a new permanent browser runner.
