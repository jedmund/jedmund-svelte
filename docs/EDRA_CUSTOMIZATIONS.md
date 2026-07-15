# Jedmund-owned Edra customizations

This document is the ownership map for Edra 3.0.1. Application behavior must
not be added to the vendored tree unless the upstream API cannot support it.

## Upstream-owned source

`src/lib/components/edra/` is the headless Edra 3.0.1 snapshot pinned in
`UPSTREAM.md`. Changes there should be limited to:

- repository import-path adaptation;
- narrow compatibility types needed by this Svelte version;
- fixes that should be proposed upstream.

Before a future re-vendor, compare that directory to its pinned upstream
commit. Do not copy Jedmund schemas into it.

## App-owned editor layer

`src/lib/editor/jedmund/` contains the behavior that is specific to this CMS:

- editor construction and variant extension registry;
- compatible bullet/ordered-list schemas that preserve legacy `tight` attrs;
- media schemas and NodeViews for image, audio, video, and gallery;
- URL embed, iframe, and geolocation schemas and NodeViews;
- media placeholders and the unified media modal bridge;
- slash-command groups and rendering;
- link context behavior, custom tables, font size, smilie replacement,
  color highlighting, search/replace, and inline-math input rules;
- custom drag-handle clipboard serialization;
- the local TipTap 3 AutoJoiner port.

All persisted node names and attributes in this layer are a data contract.
Changing one requires updating the SSR renderer, media scanner, fixtures, and
possibly stored JSON.

## Composer integration

`src/lib/components/admin/composer/` owns the public editor wrapper:

- `ComposerCore.svelte` creates and destroys the client-only editor and
  exposes the existing imperative API.
- `editorConfig.ts` maps `full`, `inline`, and `minimal` variants to extensions
  and command visibility.
- Toolbar and bubble-menu components reproduce Jedmund's command groupings on
  Edra/TipTap 3.
- `ComposerMediaHandler.svelte.ts` and `useComposerEvents.svelte.ts` connect
  uploads, paste/drop, album context, and media-library selection.

Edra's simple URL-returning upload callbacks are not a replacement for this
pipeline because Jedmund persists media record IDs and album relationships.

## Read-side contracts

`src/lib/utils/content.ts` renders stored TipTap JSON for pages, excerpts, and
RSS. It intentionally remains independent of browser-only NodeViews. It must
recognize every stored custom node and mark.

`src/lib/editor/media-references.ts` extracts media references from the same
JSON contract. `src/lib/server/media-usage.ts` applies that pure scanner to
Prisma models, including both Project `content` and `caseStudyContent`.

## Required change procedure

When changing an editor schema:

1. Add or update a synthetic fixture and renderer test.
2. Update `content.ts` and `media-references.ts` where relevant.
3. Export the current real corpus with `pnpm edra:corpus`.
4. Run `pnpm edra:corpus:verify` before and after the change.
5. Investigate every HTML or schema diff; migrate stored JSON if a rename is
   unavoidable.

Never commit `artifacts/edra-corpus/`; it may contain authored production
content.
