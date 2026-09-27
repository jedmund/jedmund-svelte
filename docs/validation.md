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
- `pnpm lint`: runs both lint checks, reports both outputs, and fails if either fails.
- `pnpm test`: unit and integration tests followed by synthetic editor schema verification.
- `pnpm build`: production application build.
- `pnpm build-storybook`: component documentation build.

CI reports type checking, ESLint, and formatting separately, even if another quality
step fails. It also runs the tests, synthetic database corpus round-trip, and both builds.

## Scope of checks

The pinned `src/lib/components/edra/` snapshot is excluded from local ESLint and
Prettier rules to keep upstream updates diffable. It remains fully type-checked,
built, and covered by editor/schema regression tests. Application-owned editor code
under `src/lib/editor/jedmund/` and the composer wrappers receives all checks.

Generated build output, corpus artifacts, and the local pnpm store are excluded from
lint/format checks. Existing Markdown and lockfile formatting exclusions remain.
Do not add source exclusions or diagnostic baselines to hide new errors.

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
