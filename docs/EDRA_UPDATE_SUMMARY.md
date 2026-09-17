# Edra 3.1.2 migration

Refreshed September 16, 2026. PR #98 remains the landing branch; no deployment
or database content migration is part of this change.

## Integration

- Edra headless `3.1.2`, commit `0fa2836174765c30f8ea30dc7835a205d04232a6`.
- TipTap packages pinned together at `3.28.0`, including transitive extensions.
- Upstream source lives in `src/lib/components/edra/`; provenance and the three
  remaining integration patches are recorded in its `UPSTREAM.md`.
- Jedmund schemas, NodeViews, drag/clipboard behavior, commands and media flows
  remain app-owned under `src/lib/editor/jedmund/` and the Composer wrapper.
- The upstream atom-selection plugin is registered once, with selection styles
  for Jedmund media, galleries, URL embeds, maps and math.
- Ordered lists inherit upstream attributes as well as legacy `tight`.
  Paragraph/link `class` attributes are explicitly retained for existing content.
- Stored node names are unchanged. No content migration is required.

## Verification

The earlier 33-document run used the existing local database, not a fresh
production export. The refreshed gate uses **29 documents** from a new isolated
production clone, across `Post.content`, `Project.caseStudyContent`,
`Album.content`, and `GardenItem.note`.

- Every document passes structural `.check()`, strict schema round-trip,
  media-reference comparison, rendering comparison, and non-browser edit/undo.
- Every document is saved and reopened through Prisma on the isolated clone;
  each transaction is rolled back and the original value checked again.
- HTML, album-context HTML, excerpts and RSS are compared with main commit
  `2a6fe469f293b31b5b1a25384ec981f5c00ba941`, using its own locked dependencies.
- Three exact renderer differences are explained: album-context photo links
  include the album slug. All other output matches main. Private approval records
  bind each explanation to the exact before/after hashes.
- Synthetic renderer snapshots cover nodes absent from production. Database
  integration tests cover dump/restore, existing-target rejection, corrupt gzip,
  failed dumps, transactional SQL failure and credential redaction.
- `pnpm check:edra` permits only the 86 recorded pre-existing diagnostics from
  `1113f9b7ef703978244cdf0583ed79752c49eeaf`; new errors and editor-owned errors fail.
- Production build passes with a valid local `REDIS_URL`.

Browser verification is intentionally excluded by request. Pointer interaction,
visual layout, focus and media-modal behavior are not claimed as verified.

## Reproduce the private data gate

Use a PostgreSQL client at least as new as production and no newer than the
local server. Verification used client/local PostgreSQL 17 against production
16. Database credentials must stay in ignored env files.

```sh
pnpm db:clone:local
# The command prints a private backups/jedmund_edra_test_<timestamp>.env path.
pnpm edra:corpus --env-file backups/<clone>.env
pnpm edra:corpus:verify
pnpm exec tsx scripts/verify-edra-schema.ts \
  --corpus artifacts/edra-corpus/documents.json --env-file backups/<clone>.env --persist
pnpm test
pnpm check:edra
REDIS_URL=redis://127.0.0.1:6379 pnpm build
```

Clone never overwrites the existing development database. Production is read
only; migrations run on the loopback clone. Environment precedence is process,
explicit `--env-file`, `.env.local`, then `.env` (dotenv parsing, not shell).
Unset an inherited `DATABASE_URL` if the explicit env file should select it.

Export creates only documents and a schema inventory, not renderer goldens.
Verification freezes main's outputs separately in `baseline-renderer.json` and
refuses to regenerate them. Supply `--output artifacts/edra-corpus/<new-run>`
for each new corpus. Verification supports `--baseline-ref <commit>` and
`--baseline-root <matching-archive>`; otherwise it archives and installs the
baseline automatically. Review `renderer-differences.json`, then record only
intentional differences in `approved-renderer-differences.json` as
`{ key, beforeHash, afterHash, reason }` entries. Never blanket-approve differences.

All dumps, database env files, corpus documents, approvals, rendered content and
reports stay ignored. Do not put production content into CI or PR attachments.

## CI and landing

`.github/workflows/edra.yml` uses Node 24, pnpm 10.15.1, PostgreSQL 16 and Redis 7
without production secrets. It runs fixtures, dump/restore integration tests,
all four synthetic Prisma fields, type regression checking and the build.
The historical migrations cannot initialize an empty database (the earliest
migration alters an existing `Media` table), so disposable CI uses `prisma db
push`. Production-clone migration status is checked separately with `db:deploy`.

Land the existing PR after CI passes; do not merge or deploy automatically.
Before deployment, take a fresh production backup. If rollback is necessary,
revert the application to the previous release. Existing stored schemas remain
compatible; restore a database backup only for demonstrated data damage, since
restoring would discard intervening edits.
