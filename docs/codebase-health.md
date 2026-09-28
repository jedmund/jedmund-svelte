# Codebase health ledger

Started September 27, 2026, against `origin/main` at `2c56f37`.

This ledger tracks the cleanup program, not a declaration that the codebase is
already healthy. Health-1 is [PR #105](https://github.com/jedmund/jedmund-svelte/pull/105), the
audit/deletion change on `refactor/codebase-health`.
Waves A–H are implemented in the working stack. Delivery and validation are recorded
below; no wave is considered merged based on this ledger.

## Audit method and scope

The file gate covers JavaScript, TypeScript, Svelte and MDX source; it does not
claim unused CSS/Sass, Prisma schema elements, dependencies or exports are audited.
Knip reports configuration hints for those compiler extensions outside the inventory.

Pinned Knip 6.38.0 uses the [SvelteKit integration](https://knip.dev/reference/plugins/sveltekit)
and [production mode](https://knip.dev/features/production-mode). `pnpm lint:unused`
checks files only, including tests, operational scripts, Storybook configuration and
Svelte stories. `pnpm audit:unused` reports production reachability; its expected
verification-only finding is recorded below. Dependencies and unused exports are
outside this gate. Source aliases are explicit so it does not depend on generated
SvelteKit configuration. Generated output is outside the project inventory; the
pinned vendored Edra snapshot is excluded from deletion candidates.

Initial results: 41 comprehensive findings, 43 production findings. Checked import
callers, recursive references, literal dynamic imports, route/hook entrypoints,
Storybook glob discovery and operational scripts before deletion. No application
import-meta glob loads these candidates. The recursive DropdownMenu reference and
references within the old post/metadata chains do not establish reachability.
The audit includes the preliminary component families and additional unreachable
application-owned editor wrappers; active persisted extension registries are unchanged.

`music-stream.ts` and `lastfmTransformers.ts` remain active; the active enrichment
and simple Last.fm manager/detector now live under `src/lib/server/music/`. The obsolete store is `now-playing-stream.ts`.
The schema contract remains because verification tooling calls it. SelectField is
the sole exact retained-file exception; its purpose is recorded below. All other
shared primitives and current stories remain subject to reachability analysis.

## Unused candidate decisions

Owner identifies the feature boundary, not an assigned person. The responsibility
of a deleted file is its superseded implementation; active replacements remain in
the same feature. Validation results are recorded separately below.

| Candidate | Owner | Import callers before cleanup | Disposition and purpose | Change | Validation required |
| ---------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------- |
| `src/lib/index.ts` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/posts.ts` | Public/shared | `src/lib/components/LinkCard.svelte`, `src/lib/components/PostContent.svelte`, `src/lib/components/PostItem.svelte`, `src/lib/components/PostList.svelte` | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/actions/tooltip.ts` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/schema-contract.ts` | Editor | `scripts/edra-corpus.ts`, `scripts/lib/renderer-comparison.ts`, `scripts/verify-edra-schema.ts`, `tests/content-renderer.test.ts`, `tests/media-references.test.ts`, `tests/schema-contract.test.ts` | Verification-only contract: used by schema tests and the corpus verifier. Expected production-only finding; comprehensive analysis covers its callers. | Health-1 | Knip both modes; full checks |
| `src/lib/stores/now-playing-stream.ts` | Music | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/Game.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/GeoCard.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/ImagePost.svelte` | Public/shared | `src/lib/components/PostContent.svelte`, `src/lib/components/PostItem.svelte` | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/LinkCard.svelte` | Public/shared | `src/lib/components/PostContent.svelte`, `src/lib/components/PostItem.svelte` | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/MasonryPhotoGrid.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/PhotoView.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/PostContent.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/PostItem.svelte` | Public/shared | `src/lib/components/PostList.svelte` | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/PostList.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/RelatedPosts.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/SingleColumnPhotoGrid.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/ThreeColumnPhotoGrid.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/TwoColumnPhotoGrid.svelte` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/types/labs.ts` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/utils/lastfmStreamManager.ts` | Music | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/utils/nowPlayingDetector.ts` | Music | `src/lib/utils/lastfmStreamManager.ts` | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/utils/time.ts` | Public/shared | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/DropdownMenu.svelte` | Admin | `src/lib/components/admin/DropdownMenu.svelte` | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/GenericMetadataPopover.svelte` | Admin | `src/lib/components/admin/PostMetadataPopover.svelte` | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/MediaInput.svelte` | Admin | `src/stories/admin/MediaInput.stories.js` | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/MetadataPopover.svelte` | Admin | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/PostDropdown.svelte` | Admin | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/PostMetadataPopover.svelte` | Admin | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/ProjectStylingForm.svelte` | Admin | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/ProjectTitleCell.svelte` | Admin | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/SelectField.svelte` | Admin | None | Intentional shared labeled Select/FormField primitive explicitly recommended by CONTRIBUTING.md; no current application caller. Exact unused-file exception. | Health-1 | Knip both modes; full checks |
| `src/lib/components/admin/StatusPicker.svelte` | Admin | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/commands/index.ts` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/components/MediaPlaceHolder.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/extensions/HandleFileDrop.ts` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/headless/menus/Link.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/headless/menus/Math.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/headless/menus/MathInline.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/headless/menus/Menu.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/headless/components/CodeBlock.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/headless/components/ToC.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/headless/components/toolbar/FontSize.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/headless/components/toolbar/QuickColors.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/lib/editor/jedmund/headless/components/toolbar/SearchAndReplace.svelte` | Editor | None | Delete unreachable implementation; no route, hook, operational, or dynamic entrypoint. Incoming references, if any, belong to the deleted chain. | Health-1 | Knip both modes; full checks |
| `src/stories/admin/MediaInput.stories.js` | Admin | Storybook glob | Delete obsolete MediaInput example with its component. | Health-1 | Storybook build |

## All 56 starting size allowances

Every starting entry has been reviewed. Removed allowances meet the ordinary
300/500-line limits or belong to deleted files. The nine retained exceptions below
keep exact, shrinking ceilings; none was increased. Styles remain with their owner.

| File | Starting ceiling | Wave and responsibilities to review | Callers | Disposition | Change / validation |
| ------------------------------------------------------------------------ | ---------------: | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `src/lib/components/AppleMusicSearchModal.svelte` | 444 | H: Public loading/navigation/playback or diagnostic UI | `src/lib/components/DebugPanel.svelte` | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 148 lines. | Health-H; validation below |
| `src/lib/components/AudioPlayer.svelte` | 431 | H: Public loading/navigation/playback or diagnostic UI | `src/lib/editor/jedmund/headless/components/AudioExtended.svelte`, `src/lib/utils/hydrate-audio-players.ts` | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 227 lines. | Health-H; validation below |
| `src/lib/components/DebugPanel.svelte` | 1129 | H: Public loading/navigation/playback or diagnostic UI | `src/routes/+layout.svelte` | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 9 lines. | Health-H; validation below |
| `src/lib/components/DynamicPostContent.svelte` | 502 | G: Content rendering or application editor interaction/styles | `src/routes/universe/[slug]/+page.svelte` | Removed allowance: content/rendering, embed/upload/location interactions and owned styles separated; fixture contracts preserved. Current: 203 lines. | Health-G; validation below |
| `src/lib/components/LabCard.svelte` | 340 | H: Public loading/navigation/playback or diagnostic UI | `src/routes/labs/+page.svelte` | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 246 lines. | Health-H; validation below |
| `src/lib/components/PhotoViewEnhanced.svelte` | 302 | H: Public loading/navigation/playback or diagnostic UI | `src/routes/photos/[id]/+page.svelte` | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 203 lines. | Health-H; validation below |
| `src/lib/components/ProjectItem.svelte` | 317 | H: Public loading/navigation/playback or diagnostic UI | `src/lib/components/ProjectList.svelte` | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 251 lines. | Health-H; validation below |
| `src/lib/components/Slideshow.svelte` | 364 | H: Public loading/navigation/playback or diagnostic UI | `src/lib/components/DynamicPostContent.svelte`, `src/lib/components/ImagePost.svelte`, `src/lib/components/UniverseAlbumCard.svelte` | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 149 lines. | Health-H; validation below |
| `src/lib/components/SocialReplies.svelte` | 320 | H: Public loading/navigation/playback or diagnostic UI | `src/routes/universe/[slug]/+page.svelte` | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 234 lines. | Health-H; validation below |
| `src/lib/components/UniversePostCard.svelte` | 427 | G: Public content rendering consumers | `src/lib/components/UniverseFeed.svelte` | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 259 lines. | Health-G; validation below |
| `src/lib/components/admin/AlbumForm.svelte` | 735 | C: Persistence, normalization, navigation and form sections | `src/routes/admin/albums/[id]/edit/+page.svelte`, `src/routes/admin/albums/new/+page.svelte` | Removed allowance: form-specific persistence and payload modules separated from presentation; shared autosave/navigation lifecycle tested. Current: 273 lines. | Health-C; validation below |
| `src/lib/components/admin/AlbumListItem.svelte` | 307 | E: Shared control interaction or admin resource operations and presentation | `src/routes/admin/albums/+page.svelte` | Removed allowance: resource operations/suggestions separated from list/control presentation. Current: 260 lines. | Health-E; validation below |
| `src/lib/components/admin/AlbumSelector.svelte` | 446 | A: Search/selection/metadata/membership lifecycle and modal rendering | `src/lib/components/admin/AlbumSelectorModal.svelte`, `src/lib/components/admin/MediaDetailsModal.svelte` | Removed allowance: modal shell/presentation separated from cancellable media, details, membership and album sessions. Current: 293 lines. | Health-A; validation below |
| `src/lib/components/admin/Button.svelte` | 421 | E: Shared control interaction or admin resource operations and presentation | `src/lib/components/LabCard.svelte`, `src/lib/components/ProjectPasswordProtection.svelte`, `src/lib/components/admin/AlbumForm.svelte`, `src/lib/components/admin/AlbumSelector.svelte`, `src/lib/components/admin/AlbumSelectorModal.svelte`, `src/lib/components/admin/BaseDropdown.svelte`, `src/lib/components/admin/DeleteConfirmationModal.svelte`, `src/lib/components/admin/GenericMetadataPopover.svelte`, `src/lib/components/admin/ImagePicker.svelte`, `src/lib/components/admin/ImageUploader.svelte`, `src/lib/components/admin/InlineComposerModal.svelte`, `src/lib/components/admin/MediaDetailsModal.svelte`, `src/lib/components/admin/MediaInput.svelte`, `src/lib/components/admin/MediaMetadataPanel.svelte`, `src/lib/components/admin/MediaUploadModal.svelte`, `src/lib/components/admin/Modal.svelte`, `src/lib/components/admin/PostDropdown.svelte`, `src/lib/components/admin/PostSyndicationForm.svelte`, `src/lib/components/admin/StatusDropdown.svelte`, `src/lib/components/admin/UnifiedMediaModal.svelte`, `src/lib/components/admin/UnsavedChangesModal.svelte`, `src/lib/components/admin/image-uploader/ImagePreview.svelte`, `src/routes/admin/albums/+page.svelte`, `src/routes/admin/garden/+page.svelte`, `src/routes/admin/media/+page.svelte`, `src/routes/admin/media/audit/+page.svelte`, `src/routes/admin/media/regenerate/+page.svelte`, `src/routes/admin/media/upload/+page.svelte`, `src/routes/admin/posts/+page.svelte`, `src/routes/admin/projects/+page.svelte`, `src/routes/admin/settings/+page.svelte`, `src/routes/admin/tags/+page.svelte`, `src/stories/admin/Button.stories.js`, `src/stories/admin/ButtonShowcase.svelte` | Retain 421: one native button/link contract with shared size, variant, loading, icon and focus styles. Splitting variants would scatter interaction and native submission semantics. Current: 421 lines. | Health-E; validation below |
| `src/lib/components/admin/FilePreviewList.svelte` | 348 | B: Upload/bulk operations, progress, filtering and presentation | `src/lib/components/admin/MediaUploadModal.svelte` | Retain 313 (was 348): preview rows, progress and attached/upload variants share scoped row styling. Object URL ownership now lives in file-previews.ts; no transport remains. Current: 313 lines. | Health-B; validation below |
| `src/lib/components/admin/FileUploadZone.svelte` | 314 | B: Upload/bulk operations, progress, filtering and presentation | `src/lib/components/admin/MediaUploadModal.svelte` | Retain 314: one drop/browse interaction, type filtering, disabled state and compact/full presentation. No asynchronous lifecycle or persistence; splitting would divide the same hit target. Current: 314 lines. | Health-B; validation below |
| `src/lib/components/admin/GardenItemForm.svelte` | 777 | C: Persistence, normalization, navigation and form sections | `src/routes/admin/garden/[id]/edit/+page.svelte`, `src/routes/admin/garden/new/+page.svelte` | Removed allowance: form-specific persistence and payload modules separated from presentation; shared autosave/navigation lifecycle tested. Current: 287 lines. | Health-C; validation below |
| `src/lib/components/admin/GenericMetadataPopover.svelte` | 475 | E: Shared control interaction or admin resource operations and presentation | `src/lib/components/admin/PostMetadataPopover.svelte` | Removed with unreachable chain (Health-1) | Health-E; required boundary scenarios and full checks |
| `src/lib/components/admin/ImagePicker.svelte` | 399 | A: Search/selection/metadata/membership lifecycle and modal rendering | `src/lib/components/admin/PostMetadataForm.svelte` | Removed allowance: modal shell/presentation separated from cancellable media, details, membership and album sessions. Current: 273 lines. | Health-A; validation below |
| `src/lib/components/admin/InlineComposerModal.svelte` | 843 | D: Composer/attachment/publishing or syndication lifecycle and presentation | `src/lib/components/admin/PostDropdown.svelte`, `src/routes/admin/posts/+page.svelte`, `src/routes/admin/universe/compose/+page.svelte` | Retain 379 (was 843): shell owns the draft, editor reference, reset and publishing callbacks/navigation. Submission, attachments, essay metadata, layout and actions have focused owners. Current: 379 lines. | Health-D; validation below |
| `src/lib/components/admin/Input.svelte` | 462 | E: Shared control interaction or admin resource operations and presentation | `src/lib/components/admin/AlbumForm.svelte`, `src/lib/components/admin/AlbumSelector.svelte`, `src/lib/components/admin/GardenItemForm.svelte`, `src/lib/components/admin/GenericMetadataPopover.svelte`, `src/lib/components/admin/InlineComposerModal.svelte`, `src/lib/components/admin/MetadataPopover.svelte`, `src/lib/components/admin/PostMetadataForm.svelte`, `src/lib/components/admin/PostSyndicationForm.svelte`, `src/lib/components/admin/ProjectBrandingForm.svelte`, `src/lib/components/admin/ProjectMetadataForm.svelte`, `src/lib/components/admin/ProjectStylingForm.svelte`, `src/lib/components/admin/UnifiedMediaModal.svelte`, `src/routes/admin/login/+page.svelte`, `src/routes/admin/media/+page.svelte`, `src/routes/admin/settings/+page.svelte`, `src/routes/admin/tags/+page.svelte`, `src/stories/admin/Input.stories.js` | Retain 462: one native input contract with label, adornments, validation and size/focus styles. These states jointly own accessible field semantics. Current: 462 lines. | Health-E; validation below |
| `src/lib/components/admin/MediaDetailsModal.svelte` | 714 | A: Search/selection/metadata/membership lifecycle and modal rendering | `src/lib/components/admin/InlineComposerModal.svelte`, `src/routes/admin/media/+page.svelte` | Removed allowance: modal shell/presentation separated from cancellable media, details, membership and album sessions. Current: 278 lines. | Health-A; validation below |
| `src/lib/components/admin/MediaGrid.svelte` | 343 | B: Upload/bulk operations, progress, filtering and presentation | `src/lib/components/admin/UnifiedMediaModal.svelte` | Retain 343: one keyboard-accessible media selection grid with thumbnail/skeleton/empty/video states and scoped selection styling. Loading and selection ownership remain external. Current: 343 lines. | Health-B; validation below |
| `src/lib/components/admin/MediaInput.svelte` | 417 | E: Shared control interaction or admin resource operations and presentation | `src/stories/admin/MediaInput.stories.js` | Removed with unreachable chain (Health-1) | Health-E; required boundary scenarios and full checks |
| `src/lib/components/admin/MetadataPopover.svelte` | 318 | E: Shared control interaction or admin resource operations and presentation | See import graph; feature composition | Removed with unreachable chain (Health-1) | Health-E; required boundary scenarios and full checks |
| `src/lib/components/admin/PostListItem.svelte` | 344 | E: Shared control interaction or admin resource operations and presentation | `src/routes/admin/posts/+page.svelte` | Removed allowance: resource operations/suggestions separated from list/control presentation. Current: 267 lines. | Health-E; validation below |
| `src/lib/components/admin/PostSyndicationForm.svelte` | 575 | D: Composer/attachment/publishing or syndication lifecycle and presentation | `src/lib/components/admin/forms/PostForm.svelte` | Removed allowance: composition/syndication transport, sessions and meaningful UI sections have focused owners. Current: 260 lines. | Health-D; validation below |
| `src/lib/components/admin/ProjectForm.svelte` | 490 | C: Persistence, normalization, navigation and form sections | `src/routes/admin/projects/[id]/edit/+page.svelte`, `src/routes/admin/projects/new/+page.svelte` | Removed allowance: form-specific persistence and payload modules separated from presentation; shared autosave/navigation lifecycle tested. Current: 179 lines. | Health-C; validation below |
| `src/lib/components/admin/SyndicationStatus.svelte` | 361 | D: Composer/attachment/publishing or syndication lifecycle and presentation | `src/lib/components/admin/AlbumForm.svelte`, `src/lib/components/admin/ProjectMetadataForm.svelte` | Removed allowance: composition/syndication transport, sessions and meaningful UI sections have focused owners. Current: 277 lines. | Health-D; validation below |
| `src/lib/components/admin/TagInput.svelte` | 480 | E: Shared control interaction or admin resource operations and presentation | `src/lib/components/admin/GenericMetadataPopover.svelte`, `src/lib/components/admin/PostMetadataForm.svelte` | Retain 312 (was 480): one combobox keyboard/selection owner and size styles. Suggestion requests, pills and results have separate owners; further division would split active-descendant state. Current: 312 lines. | Health-E; validation below |
| `src/lib/components/admin/Typeahead.svelte` | 389 | E: Shared control interaction or admin resource operations and presentation | `src/lib/components/admin/GardenItemForm.svelte` | Removed allowance: resource operations/suggestions separated from list/control presentation. Current: 260 lines. | Health-E; validation below |
| `src/lib/components/admin/UnifiedMediaModal.svelte` | 638 | A: Search/selection/metadata/membership lifecycle and modal rendering | `src/lib/components/admin/AlbumForm.svelte`, `src/lib/components/admin/ImagePicker.svelte`, `src/lib/components/admin/ImageUploader.svelte`, `src/lib/components/admin/InlineComposerModal.svelte`, `src/lib/components/admin/MediaInput.svelte`, `src/lib/components/admin/composer/ComposerCore.svelte`, `src/lib/editor/jedmund/headless/components/GalleryExtended.svelte`, `src/lib/editor/jedmund/headless/components/UnifiedMediaPlaceholder.svelte` | Removed allowance: modal shell/presentation separated from cancellable media, details, membership and album sessions. Current: 288 lines. | Health-A; validation below |
| `src/lib/components/admin/composer/ComposerBubbleMenu.svelte` | 369 | D: Composer/attachment/publishing or syndication lifecycle and presentation | `src/lib/components/admin/composer/ComposerCore.svelte` | Retain 332 (was 369): formatting/link interaction and its scoped floating-menu styles form one editor control. Selection calculation is pure and separate. Current: 332 lines. | Health-D; validation below |
| `src/lib/components/admin/composer/ComposerCore.svelte` | 413 | D: Composer/attachment/publishing or syndication lifecycle and presentation | `src/lib/components/admin/composer/index.ts` | Retain 346 (was 413): editor creation/destruction, context and event integration stay with the renderer root. Toolbar/dropdowns, uploads and media events have focused owners. Current: 346 lines. | Health-D; validation below |
| `src/lib/components/admin/forms/PostForm.svelte` | 708 | C: Persistence, normalization, navigation and form sections | `src/routes/admin/posts/[id]/edit/+page.svelte`, `src/routes/admin/posts/new/+page.svelte` | Removed allowance: form-specific persistence and payload modules separated from presentation; shared autosave/navigation lifecycle tested. Current: 212 lines. | Health-C; validation below |
| `src/lib/editor/jedmund/editor.css` | 680 | G: Content rendering or application editor interaction/styles | `src/lib/components/admin/composer/ComposerCore.svelte` | Removed allowance: content/rendering, embed/upload/location interactions and owned styles separated; fixture contracts preserved. Current: 4 lines. | Health-G; validation below |
| `src/lib/editor/jedmund/extensions/table/utils.ts` | 572 | G: Content rendering or application editor interaction/styles | `src/lib/editor/jedmund/extensions/table/table-cell.ts`, `src/lib/editor/jedmund/extensions/table/table-header.ts`, `src/lib/editor/jedmund/headless/menus/TableCol.svelte`, `src/lib/editor/jedmund/headless/menus/TableRow.svelte` | Removed allowance: content/rendering, embed/upload/location interactions and owned styles separated; fixture contracts preserved. Current: 412 lines. | Health-G; validation below |
| `src/lib/editor/jedmund/headless/components/ContentInsertionPane.svelte` | 765 | G: Content rendering or application editor interaction/styles | `src/lib/editor/jedmund/headless/components/GalleryPlaceholder.svelte`, `src/lib/editor/jedmund/headless/components/GeolocationExtended.svelte`, `src/lib/editor/jedmund/headless/components/GeolocationPlaceholder.svelte`, `src/lib/editor/jedmund/headless/components/UrlEmbedPlaceholder.svelte` | Removed allowance: content/rendering, embed/upload/location interactions and owned styles separated; fixture contracts preserved. Current: 287 lines. | Health-G; validation below |
| `src/lib/editor/jedmund/headless/components/GalleryExtended.svelte` | 328 | G: Content rendering or application editor interaction/styles | `src/lib/editor/jedmund/editor-extensions.ts` | Removed allowance: content/rendering, embed/upload/location interactions and owned styles separated; fixture contracts preserved. Current: 264 lines. | Health-G; validation below |
| `src/lib/editor/jedmund/headless/components/UrlEmbedExtended.svelte` | 610 | G: Content rendering or application editor interaction/styles | `src/lib/editor/jedmund/editor-extensions.ts` | Removed allowance: content/rendering, embed/upload/location interactions and owned styles separated; fixture contracts preserved. Current: 270 lines. | Health-G; validation below |
| `src/lib/server/apple-music-client.ts` | 550 | F: Provider transport, matching, normalization and caching | `src/lib/utils/albumEnricher.ts`, `src/routes/api/admin/debug/apple-music-search/+server.ts`, `src/routes/api/admin/garden/search/music/+server.ts`, `src/routes/api/lastfm/+server.ts` | Removed allowance: server-owned transport, matching, normalization and caching have separate modules. Current: 325 lines. | Health-F; validation below |
| `src/lib/utils/content.ts` | 715 | G: Content rendering or application editor interaction/styles | `scripts/verify-edra-schema.ts`, `src/lib/components/DynamicPostContent.svelte`, `src/lib/components/ProjectContent.svelte`, `src/lib/components/UniverseGardenCard.svelte`, `src/lib/components/UniversePostCard.svelte`, `src/lib/server/rss/helpers.ts`, `src/lib/server/syndication/syndicate.ts`, `src/lib/utils/syndication.ts`, `src/routes/albums/[slug]/+page.svelte`, `src/routes/garden/[category]/[slug]/+page.svelte`, `src/routes/universe/[slug]/+page.svelte`, `tests/content-renderer.test.ts` | Removed allowance: content/rendering, embed/upload/location interactions and owned styles separated; fixture contracts preserved. Current: 108 lines. | Health-G; validation below |
| `src/routes/admin/albums/+page.svelte` | 368 | E: Shared control interaction or admin resource operations and presentation | SvelteKit route | Removed allowance: resource operations/suggestions separated from list/control presentation. Current: 254 lines. | Health-E; validation below |
| `src/routes/admin/garden/+page.svelte` | 455 | E: Shared control interaction or admin resource operations and presentation | SvelteKit route | Removed allowance: resource operations/suggestions separated from list/control presentation. Current: 222 lines. | Health-E; validation below |
| `src/routes/admin/media/+page.svelte` | 938 | B: Upload/bulk operations, progress, filtering and presentation | SvelteKit route | Removed allowance: page presentation separated from upload queue, bulk operations and maintenance controllers. Current: 292 lines. | Health-B; validation below |
| `src/routes/admin/media/audit/+page.svelte` | 955 | B: Upload/bulk operations, progress, filtering and presentation | SvelteKit route | Removed allowance: page presentation separated from upload queue, bulk operations and maintenance controllers. Current: 220 lines. | Health-B; validation below |
| `src/routes/admin/media/regenerate/+page.svelte` | 607 | B: Upload/bulk operations, progress, filtering and presentation | SvelteKit route | Removed allowance: page presentation separated from upload queue, bulk operations and maintenance controllers. Current: 257 lines. | Health-B; validation below |
| `src/routes/admin/media/upload/+page.svelte` | 686 | B: Upload/bulk operations, progress, filtering and presentation | SvelteKit route | Removed allowance: page presentation separated from upload queue, bulk operations and maintenance controllers. Current: 131 lines. | Health-B; validation below |
| `src/routes/admin/settings/+page.svelte` | 455 | E: Shared control interaction or admin resource operations and presentation | SvelteKit route | Removed allowance: resource operations/suggestions separated from list/control presentation. Current: 125 lines. | Health-E; validation below |
| `src/routes/admin/tags/+page.svelte` | 511 | E: Shared control interaction or admin resource operations and presentation | SvelteKit route | Removed allowance: resource operations/suggestions separated from list/control presentation. Current: 258 lines. | Health-E; validation below |
| `src/routes/albums/+page.svelte` | 481 | H: Public loading/navigation/playback or diagnostic UI | SvelteKit route | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 199 lines. | Health-H; validation below |
| `src/routes/albums/[slug]/+page.svelte` | 407 | G: Public content rendering consumers | SvelteKit route | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 184 lines. | Health-G; validation below |
| `src/routes/garden/[category]/[slug]/+page.svelte` | 522 | G: Public content rendering consumers | SvelteKit route | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 286 lines. | Health-G; validation below |
| `src/routes/photos/+page.svelte` | 443 | H: Public loading/navigation/playback or diagnostic UI | SvelteKit route | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 300 lines. | Health-H; validation below |
| `src/routes/photos/[id]/+page.svelte` | 679 | H: Public loading/navigation/playback or diagnostic UI | SvelteKit route | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 218 lines. | Health-H; validation below |
| `src/routes/work/[slug]/+page.svelte` | 314 | H: Public loading/navigation/playback or diagnostic UI | SvelteKit route | Removed allowance: navigation/loading/playback/subscriptions separated from public or diagnostic presentation. Current: 220 lines. | Health-H; validation below |

## Responsibility problems below the size limits

| Owner / files | Callers | Responsibility problem and intended disposition | Change / validation |
| ---------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Forms: `useAutoSave.svelte.ts` | Project, Garden, Album, Post forms | Implemented shared autosave engine, save queue and navigation lifecycle; form-specific controllers retain validation/publishing rules. | Health-C; teardown, conflicts, rejection, first save, in-flight edits, navigation failure |
| Server: `src/routes/api/redis-client.ts` | Server utilities and API routes | Moved to `$lib/server/redis-client.ts`; route callers import its defining module. | Health-F; cache lifecycle and API contracts |
| Music: `albumEnricher.ts`, `simpleLastfmStreamManager.ts`, `simpleNowPlayingDetector.ts` | Last.fm routes | Active services moved under `$lib/server/music`; cache lifecycle separated; provider transport/matching/normalization isolated. | Health-F; cache/provider normalization/malformed data |
| Shared API: `UniverseItem` in universe route | Universe cards/feed | Moved to `$lib/types/universe.ts`; ESLint restricts library imports from route implementation files. | Health-F; type check and import restriction |
| Transport: `src/lib/admin/api.ts` | Admin callers | Common response/error parsing lives in `admin/response.ts`, shared by API and feature transports; unauthorized navigation rejection is handled. | Health-A onward; error contract, cancellation, auth/navigation failures |
| Developer UI: `DebugPanel.svelte` and stream stores | Layout/debug controls | Production wrapper gates diagnostic component construction; subscription, timer, cache and search sessions have explicit teardown. | Health-H; production browser smoke |

## Delivery order and acceptance

Health-1: audit, confirmed deletion and blocking file-only gate. Then A: shared media;
B: media administration; C: autosave/forms; D: composition/syndication; E: controls
and remaining admin; F: server ownership; G: content/editor; H: public/developer UI.
Keep deletions separate from behavior refactors. Base independent PRs on current
main after prerequisites merge; stacked PRs must name their parent and recheck on retarget.

Each behavior change needs Node regression tests for its failure/concurrency boundary,
full type checking, aggregate lint, relevant tests, affected builds and documented
browser smoke checks. Use only synthetic persistence data. Editor changes follow
[the fixture/corpus procedure](EDRA_CUSTOMIZATIONS.md). Do not add a permanent
browser runner or weaken size limits, schema contracts, routes, response shapes or design.

## Health-1 validation

Completed September 27, 2026:

- Pinned pnpm 10.15.1 / Node 24.16.0 frozen-lockfile installation passes. Knip is
  pinned to 6.38.0; its required Jiti version also updates the tooling peer resolution.
- `pnpm lint:unused`: zero findings. A temporary orphan/Svelte-story probe verified
  that the gate rejects unreachable components, follows Svelte story imports, and
  distinguishes production reachability. Probe files were removed.
- `pnpm audit:unused`: reports only `src/lib/editor/schema-contract.ts`, the expected
  verification-only module. Exit 1 is intentional for this review report; it is not
  used as a CI gate and the finding is not hidden.
- `pnpm check`: zero errors, the same seven existing CSS warnings.
- `pnpm lint`: ESLint, formatting, unused files and structure all pass; 53 remaining
  shrinking allowances, down from 56. No increased or new size exceptions.
- `pnpm test`: 56 passed, zero skipped, with a newly created loopback synthetic
  `jedmund_edra_test_health` database; six editor fixtures verify successfully.
- `pnpm build` and `pnpm build-storybook`: pass, with existing compiler, browser-data,
  Sass/font and bundle-size notices.
- Chromium against the production build: password login; desktop Posts, Projects,
  Media and Albums admin listings; Universe, Photos and Albums public pages; narrow
  Media/Universe/Photos. No uncaught page errors. External browser requests blocked.
  The first login attempt identified missing local `ORIGIN`; it passed after the
  synthetic server was restarted with an explicit loopback origin.
- Chromium against built Storybook: empty, populated, compact empty/populated,
  uploading and failed-replacement ImageUploader stories; keyboard-visible preview
  actions, retained description and upload-disabled states verified.
- Markdown formatting and `git diff --check` pass. No persisted schema/registry or
  active rendering changes; production corpus migration verification is not applicable.

Health-1 deleted 41 unreachable source files and one obsolete story. Subsequent
waves implement the behavior boundaries below.

## Waves A–H implementation and review

- **A — shared media:** cancellable query sessions own search/pagination and retain
  selected records across filters; metadata sessions own replacement, teardown and
  save timers; album membership sessions acknowledge each successful delta for retry.
  Modal sections own filters, previews and actions. Nested modals restore focus and
  retain parent scroll locks. The previously ignored single-album callback now works.
- **B — media administration:** the page and modal share one upload queue and transport.
  File identity distinguishes duplicate filenames; successful entries survive retry.
  Object URL ownership is separate from previews. Listing batches preserve failed
  selections; audit and regeneration controllers own requests, progress and timers.
- **C — forms:** one autosave engine owns debounce/status timers and rejected background
  work; navigation protects dirty state after failure. Domain controllers own payloads,
  first-save transitions and submitted snapshots, preserving edits during requests.
  Album creation remains committed if photo attachment fails. Queued background saves
  check publishing eligibility when executed, so they cannot revert a completed Publish.
- **D — composition/syndication:** submission snapshots and cancellation are separate
  from composer presentation. Upload placeholders are located by their own blob URL;
  failed uploads remove only that placeholder, without undoing later user edits.
  Syndication owns stale-safe remote reads, retry and manual-link persistence.
- **E — controls/admin:** suggestion lifecycles are separate from combobox keyboard
  state. Resource sessions own collection reads and duplicate-mutation protection.
  Settings preserve edits during saves and release test timers. Shared filters wrap
  on narrow screens; delayed outside-click listeners cannot attach after teardown.
- **F — server:** Redis and active music services live under server ownership. Apple
  provider transport, matching, normalization and cache coordination are separate.
  `UniverseItem` is shared data, not a route import; ESLint enforces that boundary.
- **G — content/editor:** normalization, rendering, sanitization and excerpts have
  defining modules. Insertion upload/location/embed interactions and gallery controls
  have focused owners. Editor style imports preserve cascade order and rendering scope.
  Unreachable table move calculations were removed; persisted schemas are unchanged.
- **H — public/developer UI:** shared paged feeds serialize loading and retain partial
  pages for retry. Photo navigation, zoom, tilt, slideshows, replies, audio playback and
  waveform resources have explicit lifetimes. Diagnostic UI is dynamically instantiated
  only in development; cache/search operations cancel on teardown and reject stale data.

Additional reviewed files below the old limits include `MediaUploadModal.svelte`,
`AlbumSelectorModal.svelte`, `BaseModal.svelte`, `clickOutside.ts`, the project form
store, waveform extraction and public paged-feed consumers. Their lifecycle fixes
are covered by the same boundary tests and browser checks as their owning waves.

The refactors made `src/lib/components/admin/composer/index.ts` (forwarding-only
composer entrypoint) and `src/lib/utils/debounce.ts` (old suggestion timer helper)
unreachable. Their callers now import defining modules/use cancellable suggestion
sessions; both files were removed. No dynamic, framework or operational callers remain.

## Stack validation

Validation uses Node 24.16.0, pinned pnpm 10.15.1, loopback PostgreSQL database
`jedmund_edra_test_health`, Redis database 15, synthetic credentials and fixture data.
Live provider writes and production persistence are not part of these checks.
Final command results and PR links are recorded when the stack checks finish.
