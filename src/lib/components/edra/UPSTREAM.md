# Edra upstream provenance

- Version: `3.0.1`
- Commit: `d3f27f8d92c091bf5ec01dbf146d95d31efb25ac`
- Branch at capture: `next`
- Flavor: `headless`
- Source: `~/Developer/Personal/edra-mcp-server/vendor/edra/src/lib/edra`
- Upstream TipTap range baseline: `^3.27.3`
- Installed aligned TipTap patch: `3.27.4`
- Captured: `2026-07-15`

The directory is copied from the source snapshot above. The unused `shadcn/`
flavor is excluded. Jedmund-owned extensions and UI live under
`src/lib/editor/jedmund/` so future upstream replacements remain diffable.

## Integration-only path patches

The upstream copy assumes it lives directly at `$lib/edra`. Jedmund vendors it
at `$lib/components/edra`, so absolute imports were rewritten accordingly. Its
`$lib/utils.js` imports were redirected to the vendored `utils.ts` module.
The local Svelte renderer accepts typed Svelte components across this
repository's Svelte version, and `cn` is provided by the vendored utilities
module for headless class composition. The Mermaid NodeView uses explicit
diagram types compatible with the installed Mermaid release. The slash-command
renderer narrows its component props at the renderer boundary, and media command
declarations are merged with Jedmund's existing TipTap command augmentations.

These are integration patches, not document-schema changes. Keep them as a
small, reviewable diff when replacing this snapshot.

No Jedmund document schemas should be added here. Add them to the app-owned
extension registry instead.
