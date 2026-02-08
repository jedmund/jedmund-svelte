# POSSE Syndication Plan

## Context

Publish content on jedmund.com, automatically syndicate to Bluesky and Mastodon (`@jedmund@fireplace.cafe`). Display replies from both platforms beneath posts on the site.

---

## Architecture

Both platforms are just API clients — same pattern as the existing Apple Music and Last.fm integrations. When content is published, fire-and-forget API calls post it to each platform. A `Syndication` table tracks what went where.

```
Publish (POST /api/posts, etc.)
  │
  ├─→ postToBluesky()     → @atproto/api
  └─→ postToMastodon()    → fetch() to fireplace.cafe API
  │
  └─→ Record in Syndication table
```

Credentials live in `.env` (like `LASTFM_API_KEY`, `APPLE_MUSIC_*`, etc.). No settings database table.

---

## Phase 1: Platform Clients

### Dependencies

```
npm install @atproto/api
```

No extra dependency for Mastodon — it's a REST API.

### Environment Variables

Add to `.env`:

```bash
BLUESKY_HANDLE="jedmund.com"
BLUESKY_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
MASTODON_INSTANCE="fireplace.cafe"
MASTODON_ACCESS_TOKEN="your-token-here"
SITE_URL="https://jedmund.com"
```

Mastodon access token: create an application at `fireplace.cafe/settings/applications` with `write:statuses` and `write:media` scopes.

### New Files

**`src/lib/server/bluesky/client.ts`** — Bluesky API client

Follow the pattern of `apple-music-client.ts`: module-level client, env-var auth, error logging via `logger`. Cache the authenticated session in Redis using `CacheManager` (add a `bluesky-session` cache type) so it persists across server restarts. Re-authenticate when session expires.

**`src/lib/server/bluesky/post.ts`** — Post to Bluesky

- Use `getContentExcerpt(content, 280)` from `$lib/utils/content` for text
- Append canonical URL to post text
- Use `RichText` from `@atproto/api` for proper grapheme counting and link facets
- Images: fetch from Cloudinary URL → resize with Sharp to <1MB → upload via `agent.uploadBlob()` → attach as embed (max 4)
- For essays/projects with no attached images: use external embed (link card) instead
- Return `{ uri, cid }` — construct Bluesky URL from these

**`src/lib/server/mastodon/post.ts`** — Post to Mastodon

- Use `getContentExcerpt(content, 480)` for text (leave room for URL)
- Append canonical URL
- Images: upload via `POST https://fireplace.cafe/api/v2/media` → get media IDs → attach to status
- Create status via `POST https://fireplace.cafe/api/v1/statuses` with `{ status, media_ids, visibility: 'public' }`
- Return `{ id, url }` from the response

Both clients should follow the `apple-music-client.ts` error handling pattern: log the HTTP status, response body, and a descriptive error message.

### Content Mapping (per type)

No separate content-mapper file. Each post function handles formatting directly:

| Content | Bluesky | Mastodon |
|---|---|---|
| Post (short) | `getContentExcerpt(content, 280)` + images + link | `getContentExcerpt(content, 480)` + images + link |
| Essay | `title + "\n\n" + getContentExcerpt(content, 200)` + link card | Same pattern, longer excerpt |
| Photo | Caption text + image + link | Same |
| Album | Title + description + up to 4 photos + link | Same |
| Project | `"New: " + title + "\n\n" + description` + featured image + link | Same |

---

## Phase 2: Syndication Tracking

### Database

Add to `prisma/schema.prisma`:

```prisma
model Syndication {
  id           Int       @id @default(autoincrement())
  contentType  String    @db.VarChar(50)
  contentId    Int
  platform     String    @db.VarChar(50)
  externalId   String?   @db.VarChar(500)
  externalUrl  String?   @db.VarChar(500)
  status       String    @db.VarChar(50)     // 'success' or 'failed'
  errorMessage String?   @db.Text
  createdAt    DateTime  @default(now())

  @@unique([contentType, contentId, platform])
  @@index([contentType, contentId])
}
```

No retry columns, no `updatedAt`, no `lastAttemptAt`. If it fails, you click "Retry" in the admin UI and it deletes the old record and tries again.

### Syndication Function

**`src/lib/server/syndication/syndicate.ts`**

```ts
import { postToBluesky } from '../bluesky/post'
import { postToMastodon } from '../mastodon/post'

export async function syndicateContent(contentType: string, contentId: number) {
  const content = await loadContent(contentType, contentId)
  if (!content) return

  const results = await Promise.allSettled([
    syndicateTo('bluesky', contentType, contentId, content),
    syndicateTo('mastodon', contentType, contentId, content)
  ])

  // Log results, record in Syndication table
}
```

Lean function — loads content, calls both platforms in parallel, records results. No generic "platform registry" or plugin system. Two platforms, two function calls.

### Hook Into Existing API Routes

In `src/routes/api/posts/+server.ts` POST handler (~line 159), after the post is created:

```ts
if (post.status === 'published') {
  syndicateContent('post', post.id)
    .catch(err => logger.error('Auto-syndication failed', err))
}
```

Same pattern in:
- `src/routes/api/posts/[id]/+server.ts` PATCH handler (when status changes to published)
- `src/routes/api/projects/[id]/+server.ts`
- `src/routes/api/albums/[id]/+server.ts`

Fire-and-forget: don't `await`, don't block the response.

### Files

- `prisma/schema.prisma` — add `Syndication` model
- `src/lib/server/syndication/syndicate.ts` — new
- `src/routes/api/posts/+server.ts` — add syndication call after publish
- `src/routes/api/posts/[id]/+server.ts` — add syndication call on status change
- `src/routes/api/projects/[id]/+server.ts` — same
- `src/routes/api/albums/[id]/+server.ts` — same

---

## Phase 3: Admin UI

### Syndication Status Component

**`src/lib/components/admin/SyndicationStatus.svelte`**

A small widget that goes in the post/project/album editor sidebar. Shows:

- Per-platform status: green dot + "View" link for success, red dot + error message for failure
- "Syndicate Now" button (if not yet syndicated or to retry after failure)
- Only visible for published content

Fetches status from `GET /api/syndication/status?contentType=post&contentId=123`.

### API Routes

**`src/routes/api/syndication/status/+server.ts`** — GET, admin-only
- Returns `Syndication` records for a given content type + ID

**`src/routes/api/syndication/trigger/+server.ts`** — POST, admin-only
- Manually trigger syndication for a content item
- Deletes existing failed record first, then syndicates fresh

### Files to Modify

Add `<SyndicationStatus>` to:
- `src/routes/admin/posts/[id]/edit/+page.svelte` — in the metadata panel
- `src/routes/admin/projects/[id]/edit/+page.svelte`
- `src/routes/admin/albums/[id]/edit/+page.svelte`

---

## Phase 4: Social Replies (Backfeed)

Display replies from both platforms underneath posts, similar to [davidcel.is](https://davidcel.is/articles/rails-needs-new-governance).

### How It Works

1. Post page loads normally (server-rendered)
2. `SocialReplies` component mounts client-side → calls `/api/syndication/replies`
3. API route looks up `Syndication` records → fetches replies from each platform → caches in Redis → returns
4. Component renders replies beneath the post content

### Fetching Replies

**Bluesky**: `agent.getPostThread({ uri })` → `thread.replies[]`
- Each reply: author handle, displayName, avatar, text, createdAt, URI

**Mastodon**: `GET https://fireplace.cafe/api/v1/statuses/:id/context` → `{ descendants: [] }`
- Public endpoint (no auth required)
- Each descendant: account info, content (HTML), created_at, url

### Caching

Add cache types to `CacheManager`:

```ts
['syndication-replies', { prefix: 'syndication:replies:', defaultTTL: 300, description: 'Social replies' }]
```

Cache key: `{contentType}:{contentId}`. 5-minute TTL.

### New Files

**`src/routes/api/syndication/replies/+server.ts`** — Public endpoint
- Looks up `Syndication` records for the content
- Checks Redis cache first
- If miss: fetches replies from each platform, normalizes, caches, returns

**`src/lib/components/SocialReplies.svelte`** — Public component
- Fetches replies on mount
- Renders: "Replies (N)" header
- Per reply: avatar, display name (linked to profile), handle, timestamp (linked to reply on platform), content
- Platform icon next to each reply
- "Reply on Bluesky" / "Reply on Mastodon" call-to-action links at bottom

### Reply Shape

```ts
interface SocialReply {
  platform: 'bluesky' | 'mastodon'
  author: {
    name: string
    handle: string
    avatarUrl: string
    profileUrl: string
  }
  content: string
  createdAt: string
  url: string
}
```

### Integration

In `src/routes/universe/[slug]/+page.svelte`, between `<DynamicPostContent>` and the footer:

```svelte
<DynamicPostContent {post} />
{#if post.id}
  <SocialReplies contentType="post" contentId={post.id} />
{/if}
```

---

## Bonus: Domain as Bluesky Handle

Add `src/routes/.well-known/atproto-did/+server.ts`:

```ts
export const GET = () => new Response('did=did:plc:your-did-here')
```

Or add a DNS TXT record: `_atproto.jedmund.com` → `did=did:plc:your-did-here`

---

## All Files

### New (10)
```
src/lib/server/bluesky/client.ts
src/lib/server/bluesky/post.ts
src/lib/server/mastodon/post.ts
src/lib/server/syndication/syndicate.ts
src/lib/components/admin/SyndicationStatus.svelte
src/lib/components/SocialReplies.svelte
src/routes/api/syndication/status/+server.ts
src/routes/api/syndication/trigger/+server.ts
src/routes/api/syndication/replies/+server.ts
prisma/migrations/XXXX_add_syndication/
```

### Modified (7)
```
prisma/schema.prisma                        — add Syndication model
src/lib/server/cache-manager.ts             — add bluesky-session and syndication-replies cache types
src/routes/api/posts/+server.ts             — fire-and-forget syndication on publish
src/routes/api/posts/[id]/+server.ts        — syndication on status change to published
src/routes/api/projects/[id]/+server.ts     — syndication on publish
src/routes/api/albums/[id]/+server.ts       — syndication on publish
src/routes/universe/[slug]/+page.svelte     — add SocialReplies component
```

---

## Verification

1. Configure `.env` with Bluesky app password and Mastodon access token
2. Publish a test post → verify it appears on bsky.app and fireplace.cafe
3. Check `Syndication` table → should have two rows with status 'success' and external URLs
4. Visit the post page → `SocialReplies` should load (empty initially)
5. Reply to the syndicated post from Bluesky or Mastodon → wait 5 min for cache → reload post page → reply should appear
6. In admin editor, `SyndicationStatus` should show green dots with "View" links
7. Edge cases: long essay (truncation), post with 5+ images (capped at 4), Unicode/emoji content
