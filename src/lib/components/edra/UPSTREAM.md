# Edra upstream provenance

- Version: `3.1.2`
- Commit: `0fa2836174765c30f8ea30dc7835a205d04232a6`
- Tag: `3.1.2`
- Flavor: `headless`
- Source: `https://github.com/Tsuzat/Edra`, `src/lib/edra`
- Upstream TipTap range baseline: `^3.28.0`
- Installed aligned TipTap version: `3.28.0` (including transitive extensions)
- Refreshed: `2026-09-16`

The directory is copied from the source snapshot above. The unused `shadcn/`
flavor is excluded. Jedmund-owned extensions and UI live under
`src/lib/editor/jedmund/` so future upstream replacements remain diffable.

## Integration-only path patches

The upstream copy assumes it lives directly at `$lib/edra`. Jedmund vendors it
at `$lib/components/edra`, so absolute imports were rewritten accordingly. Its
`$lib/utils.js` imports were redirected to the vendored `utils.ts` module.
After import-path adaptation, exactly three files differ from this upstream
snapshot: `utils.ts` provides the `cn` helper for headless class composition;
`tiptap/extensions/audio/index.ts` and `tiptap/extensions/video/Video.ts` retain
command declarations merged with Jedmund's TipTap command augmentations.
Previous Svelte renderer and Mermaid typing patches are now upstream and are
not reapplied. The selection plugin is unmodified; its app-owned NodeView
styling lives in `src/lib/editor/jedmund/selection.css`.

These are integration patches, not document-schema changes. Keep them as a
small, reviewable diff when replacing this snapshot.

No Jedmund document schemas should be added here. Add them to the app-owned
extension registry instead.
