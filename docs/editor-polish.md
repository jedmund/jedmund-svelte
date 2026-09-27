# Editor polish after the Edra 3.1.2 upgrade

This ports the useful parts of PRs #96 and #97 onto current main. All editor changes
live in `src/lib/editor/jedmund/` or the application composer. The pinned
`src/lib/components/edra/` snapshot and TipTap versions are unchanged.

## Behavior

- Media, galleries and locations share one hover/selection toolbar. Buttons do not
  submit their enclosing form. Duplicate actions use the node's current position,
  independently of the text selection.
- Caption and image alt-text inputs update document attributes on every input, so
  saving while an input has focus includes the latest text. Undo and external
  attribute changes update the fields. Opening the caption control adds no text.
- New media uses its description for alt text; captions are opt-in.
- Galleries offer grid/masonry and one-, two-, or three-column controls. Existing
  four-to-six-column and carousel content still renders. Mobile reduces column
  counts to at most two while preserving one-column layouts. Stored gallery
  titles render as captions, and image links retain their album context.
- Location controls support editing, duplication and deletion. Editing opens a
  prefilled picker without removing the map; cancellation changes nothing.
  Updates, including zero coordinates, are undoable and refresh the map preview.
- Shared public styles cover galleries, tables, iframes, captions and maps on
  posts, case studies, garden notes and albums. Editor and public tables share
  corner radius, border and header colors. Public maps include a lazy OSM embed
  and retain their readable link. CSP permits OSM frames and map tiles.
- Text color, font-size and alignment controls are removed; highlight is a simple
  toggle. Legacy formatting schema support remains to prevent content loss when
  opening old documents. Underline already comes from TipTap 3's StarterKit.

## Compatibility and validation

The upgrade already provided table, iframe, gallery, subscript and superscript
rendering; those implementations are retained and extended rather than replaced.
No stored node names, schema attributes or database records are migrated.

Renderer tests cover gallery captions/layouts/links, hostile text, OSM embeds,
merged cells and inline marks. A legacy formatting fixture verifies that color,
font size, alignment, colored highlight and underline survive editor round-trips.
Reviewed HTML/RSS snapshot changes add the map embed and the new fixture.

Browser smoke checks use synthetic content and a local admin session. They cover
caption/alt edits before blur, undo, media width constraints, gallery layouts in
editor and public views, mobile one-column behavior, duplication with the text
selection elsewhere, location editing/cancellation/undo, and shared table styles.
External map responses are stubbed, so these checks validate the integration and
layout rather than the availability of the map service. The temporary harness is
removed after validation.

Validation on September 26, 2026: `pnpm check` reports zero errors and the seven
existing CSS warnings; `pnpm lint`, all 39 tests, six synthetic editor fixtures,
and both builds pass. Fourteen synthetic local database documents also pass the
schema/edit/undo/persistence verifier, with persistence writes rolled back.
