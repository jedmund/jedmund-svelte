# Edra 3 features in Jedmund

This replaces the historical Edra 2.4 feature evaluation.

## Adopted

- TipTap 3 editor, extension, command, and NodeView APIs.
- Edra 3 headless editor primitives and Svelte NodeView renderer.
- Edra toolbar, bubble-menu, slash-command, and drag-handle foundations.
- Official TipTap Markdown and Mathematics extensions.
- TipTap 3 table, list, link, typography, text-style, and media foundations.
- Content checking during editor creation to surface invalid JSON.

## Adapted for Jedmund

- Toolbar and bubble-menu command sets are selected by Composer variant.
- Legacy list and media attributes are preserved during schema parsing.
- Custom nodes are mounted through Edra's renderer but keep Jedmund UI and
  backend semantics.
- Upload/drop entry points feed the existing media pipeline rather than
  replacing it with URL-only callbacks.
- The public renderer supports task lists, tables, math, galleries, maps,
  iframes, and all media/embed nodes.

## Not adopted as application behavior

- The shadcn flavor: Jedmund continues to use its own headless styling.
- Stock media upload semantics: they cannot carry `mediaId`, album, modal, and
  bulk-upload state.
- Automatic schema renames or normalization: persisted JSON compatibility has
  priority.

Future Edra features should be evaluated against the vendor boundary and the
corpus gates documented in `EDRA_CUSTOMIZATIONS.md`.
