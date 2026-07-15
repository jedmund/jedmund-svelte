# Edra 3 media integration

Jedmund deliberately keeps its application-owned media workflow on top of
Edra 3. Edra's stock callbacks resolve a selected file to a source URL; the CMS
also needs persistent media IDs, album context, a shared library modal,
Cloudinary metadata, optimistic uploads, and bulk-upload support.

## Data contract

The editor stores TipTap JSON in Prisma. Relevant references include:

- image, audio, and video `mediaId` attributes;
- gallery item `mediaId` attributes;
- URL embed `imageMediaId` and `faviconMediaId` attributes;
- source URLs as a compatibility fallback.

The node and attribute names must remain stable. The pure scanner in
`src/lib/editor/media-references.ts` is shared by
`src/lib/server/media-usage.ts` and has fixture coverage for each shape.

## Editor flow

`ComposerMediaHandler.svelte.ts` coordinates direct uploads and insertion.
`UnifiedMediaModal` remains the browser UI for selecting existing media.
Custom TipTap 3 NodeViews under `src/lib/editor/jedmund/` preserve media IDs
when inserting or editing nodes. Paste/drop hooks route through the same
application pipeline.

## Read flow

`src/lib/utils/content.ts` renders image figures, audio players, videos,
galleries, and URL embed metadata without loading the editor. It is used by
public pages and RSS, so changes must be tested independently of NodeViews.

## Verification

Run the synthetic tests for fast feedback and the corpus gate before shipping:

```sh
pnpm test
pnpm edra:corpus:verify
```

Any changed media markup or lost ID in those outputs is a release blocker until
explained or migrated.
