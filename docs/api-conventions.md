# Core CMS API conventions

Posts, Projects, Albums, and Garden now share request validation and error handling.
This includes Album media attachment/removal. Media uploads and metadata, tags,
settings, syndication endpoints, public project unlocking, preview generation,
and external search integrations remain separate follow-up migrations.

## Calling APIs

Admin browser code uses `api` or `request` from `$lib/admin/api`. Responses retain
their existing shapes; the client does not wrap successful data or validate it at
runtime. The generic response type describes the existing endpoint contract.

```ts
const album = await api.post<Album>('/api/albums', payload)
await request(`/api/albums/${album.id}/media`, {
  method: 'DELETE',
  body: { mediaIds: [mediaId] }
})
```

The transport preserves credentials, custom headers, abort signals, and FormData
upload boundaries. It sends all explicitly supplied JSON values, including null,
false, zero, and empty strings. A 401 navigates to the admin login page and still
rejects with the original API error. Network failures and cancellation retain
their original errors.

API errors use the existing envelope:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": {
      "fieldErrors": { "title": ["Title is required"] },
      "formErrors": []
    }
  }
}
```

`ApiError` exposes `message`, `status`, `code`, and the nested `details`.
`getErrorMessage(error, fallback)` produces an actionable summary;
`getFieldErrors(error)` supplies the first message for each field. Do not parse
error responses again in components. Malformed/non-JSON failures produce a safe
status-based fallback, not HTML or an object coerced into a message. Empty success
responses return undefined; malformed nonempty JSON successes reject.

Server loads and form actions continue to use the session-aware `adminFetch`
helpers. They share error decoding with the browser client. Expected 4xx failures
from Post/Project actions become `fail(status, { message })`; authentication
redirects and unexpected errors retain their normal behavior.

## Validating writes

The browser-safe schemas in `$lib/schemas/cms` are the source of request types.
Use `readValidatedBody(request, schema)` and return its error response immediately
when parsing fails. Valid JSON alone is not validation, and a TypeScript generic
must not substitute for a runtime schema.

The schemas check object bodies, field types, supported statuses and categories,
integer ranges, database string limits, real calendar dates, and ID arrays.
Unknown top-level fields are stripped; raw Prisma relation objects are never
accepted. Create and update schemas are separate: partial updates have no create
defaults. Omitted fields stay omitted, and explicit null is accepted only for
nullable fields. Nullable JSON updates clear the SQL column when explicitly null.

Editor documents receive structural validation while retaining custom attributes,
node types, and supported legacy block content. This does not replace the editor
schema verifier or migrate persisted content. Album dates accept a four-digit
year, a calendar date, or an ISO timestamp; Garden dates accept calendar dates or
ISO timestamps. Empty/null date values clear optional dates. `updatedAt` accepts
an ISO timestamp for the existing optimistic concurrency check (also enforced
for Album updates).

For updates, validate the request, load the existing record, check concurrency,
and validate the effective record with `validatePublishing` before any write,
media enrichment, image caching, or syndication. Status-only changes must use
existing content when checking publishing requirements. Missing records and
conflicts retain their 404/409 responses; invalid requests return 400.

## Publishing requirements

Every save whose resulting status is published must meet these rules, including
edits to existing published records:

| Content | Requirements |
| --- | --- |
| Post | Valid slug and meaningful content or media attachments. |
| Essay | Post requirements plus a nonblank title. |
| Project | Nonblank title, valid slug/type, year from 1990 through next year, valid optional URL/colors, and a password when protected. Applies to all non-draft statuses, including list-only. |
| Album | Nonblank title and valid slug. Photos and descriptive content remain optional. |
| Garden | Nonblank title, valid slug and category. Images, notes, and ratings remain optional. |

Blank paragraphs, whitespace, and insertion placeholders do not count as Post
content. Text, media, embeds, and supported legacy content do. Drafts skip these
publishing checks while retaining structural validation and existing minimum
creation fields. Moving an incomplete published record back to draft is allowed.
Existing records are not automatically changed: their next published save may
require corrections. There is no database migration or backfill.

Forms keep local edits when a request fails, display the error, and adopt saved
status/snapshots only after success. Autosave still distinguishes a 409 conflict
from other failures. Changing a status dropdown is an unsaved intention; it must
not be treated as a successful publication.

## Pagination

The shared helpers cover Posts, Projects, Media, Albums, and Photos. Only omitted
parameters get defaults: page 1/limit 20 or offset 0/limit 50. Supplied values must
be decimal integers, with page at least 1, offset at least 0, and limit between
1 and the configured maximum (normally 100). Empty strings, malformed values,
fractions, out-of-range values, and overflowing database offsets return 400.
Catch `PaginationError` and return its response before the generic error handler.

Existing bespoke pagination in Universe, tags, related posts, and provider searches
is outside this migration.

## Regression checks

`pnpm test` includes transport, schema, publishing, and pagination unit tests.
With `TEST_DATABASE_URL` set, the CMS HTTP tests start a temporary local Vite
server and exercise authenticated requests against a loopback database named
`jedmund_edra_test_*`. They require local Redis, reject databases containing
integration secrets, override local dotenv credentials, and remove their test
records afterward. CI supplies these services and runs the HTTP tests.

See [Development validation](./validation.md) for the full checks and editor
corpus verification procedure.
