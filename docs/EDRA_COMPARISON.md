# Edra 3.0.1 integration comparison

The previous version of this document compared two Edra v2 snapshots. That
comparison is obsolete after the TipTap 3 migration. This is the current merge
map for future upstream updates.

| Area | Upstream Edra 3.0.1 | Jedmund integration |
| --- | --- | --- |
| Editor engine | TipTap 3 | TipTap packages aligned to 3.27.4 |
| Svelte NodeViews | Edra's internal renderer | Reused by all custom NodeViews |
| UI flavor | Headless and shadcn available | Headless only |
| Core menus | Toolbar, bubble menus, slash command, drag handle | Composer filters/wraps these surfaces |
| Media insertion | Simple upload/file callbacks | Unified modal, IDs, albums, Cloudinary, bulk upload |
| Custom documents | Standard Edra nodes | Gallery, geolocation, URL embed, custom iframe/media attrs |
| Rendering | Browser editor output | Independent sanitized SSR/RSS renderer |
| Persistence | TipTap JSON | Prisma JSON columns; schema is load-bearing |

## Vendor boundary

The exact upstream commit and integration patches are recorded in
`src/lib/components/edra/UPSTREAM.md`. Jedmund code is located under
`src/lib/editor/jedmund/`, not mixed into the vendor snapshot.

For the next update:

1. copy the new headless snapshot into a scratch directory;
2. diff it against the currently pinned commit;
3. reapply only the small integration patches listed in `UPSTREAM.md`;
4. compile the app-owned editor layer against it;
5. run fixture tests and the real corpus gate before replacing the current
   vendor tree.

## Deliberate divergences

- Node/attribute names remain compatible with stored v2-era documents.
- The custom media pipeline remains authoritative.
- The custom drag/clipboard behavior is retained where Edra's stock surface is
  too narrow.
- SSR/RSS rendering remains decoupled and is verified by golden snapshots.
- Auto-join behavior is locally ported because the prior third-party package
  has no suitable TipTap 3 release.
