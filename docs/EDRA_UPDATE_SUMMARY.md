# Edra 3.0.1 migration summary

**Date:** 2026-07-15

**Status:** Implemented; automated migration gates pass

## Result

Jedmund now vendors Edra headless 3.0.1 on TipTap 3.27.4. The migration keeps
the existing Composer API, custom media workflow, and persisted TipTap JSON
schema while replacing the v2 Edra fork and `svelte-tiptap` integration.

The vendored source is pinned to Edra commit
`d3f27f8d92c091bf5ec01dbf146d95d31efb25ac`. See
`src/lib/components/edra/UPSTREAM.md` for provenance and the intentionally
small integration patch set.

## Architecture

- `src/lib/components/edra/` is upstream-owned Edra headless source.
- `src/lib/editor/jedmund/` contains Jedmund-owned schemas, NodeViews,
  commands, drag handling, and editor configuration.
- `src/lib/components/admin/composer/` remains the application wrapper and
  preserves the `full`, `inline`, and `minimal` variants.
- `src/lib/utils/content.ts` remains the SSR/RSS JSON-to-HTML renderer.
- `src/lib/editor/media-references.ts` is the shared, schema-aware media-ID
  scanner used by server-side media usage tracking.

This split makes the next Edra update a source replacement plus a small
upstream diff instead of another hard-fork merge.

## Dependency migration

- All direct `@tiptap/*` packages are aligned to `3.27.4`.
- `svelte-tiptap` was removed; NodeViews use Edra's TipTap 3 Svelte renderer.
- `tiptap-markdown` was replaced by official `@tiptap/markdown`.
- `@aarkue/tiptap-math-extension` was replaced by
  `@tiptap/extension-mathematics`.
- The old global drag-handle package was replaced by TipTap's supported drag
  handle plus Jedmund's retained clipboard/drag behavior.
- The unmaintained auto-joiner was ported as the app-owned TipTap 3 extension
  `src/lib/editor/jedmund/extensions/AutoJoiner.ts`.

## Data-safety gates

The migration adds a repeatable corpus harness rather than relying on editor
startup alone:

```sh
pnpm edra:corpus          # export JSON and renderer goldens from Prisma
pnpm edra:corpus:verify   # verify goldens and TipTap 3 schema round-trips
pnpm test                 # unit/fixture renderer and schema tests
```

`artifacts/edra-corpus/` is intentionally ignored because it can contain
production-authored content. The checked-in synthetic fixture covers custom
nodes without exposing database data.

On the migration corpus, all 33 rich-text documents pass both renderer golden
verification and TipTap 3 schema round-tripping. The schema gate found and
prevented two otherwise-silent regressions during the port:

- URL embed media attributes would have been discarded by a duplicate node
  schema.
- Legacy list `tight` attributes would have been discarded by TipTap 3 list
  defaults.

The compatibility extensions retain those persisted attributes. Comparison
normalization is restricted to known non-semantic default materialization and
mark ordering; it does not ignore unknown content changes.

## Preserved application behavior

- Composer methods: `focus`, `blur`, `clear`, `isEmpty`, `getContent`, and
  `getText`.
- Composer variants and feature-driven toolbar/bubble-menu filtering.
- Image, audio, video, gallery, geolocation, iframe, and URL-embed NodeViews.
- Unified media modal, direct uploads, album context, Cloudinary sources, and
  persisted `mediaId` attributes.
- Slash commands, link manager, search/replace, tables, mathematics, and custom
  drag/clipboard behavior.
- SSR pages, excerpts, and RSS rendering through `content.ts`.

## Verification performed

- Unit and schema-contract test suite passes.
- The configured 33-document corpus passes renderer and schema verification.
- Migration-owned Svelte/TypeScript files report no `svelte-check` errors.
- The production Vite build completes with a valid `REDIS_URL` configuration.

The repository still has pre-existing `svelte-check` failures outside the
editor migration surface; they are not introduced by this work. Interactive
browser QA remains appropriate before deployment for visual and pointer-driven
behavior such as drag handles, media modals, maps, and link popovers.
