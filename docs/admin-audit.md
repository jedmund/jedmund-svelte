# Admin Interface Audit Report

## Context

This report audits the admin interface of the jedmund-svelte portfolio site. The admin is a custom-built CMS with project, post, album, and media management. Authentication uses a single shared password with HMAC-signed session cookies. The goal is to identify security vulnerabilities, infrastructure improvements, and business-logic bugs — and explain each clearly so they can be prioritized and addressed.

---

## 1. Security Issues

### 1.1 Project Passwords Are Verified Client-Side (Critical)

**Files:** `src/lib/components/ProjectPasswordProtection.svelte`, `src/routes/work/[slug]/+page.ts`

Password-protected projects have a serious flaw: the actual password is sent to the browser as part of the API response, and the check happens entirely in JavaScript on the client. The component receives the password as a prop (`correctPassword={project.password || ''}`) and compares it locally. This means:

- Anyone can open the browser's network tab and see the password in the API response.
- Anyone can hit `/api/projects?includePasswordProtected=true` directly and read the full project data, password included.
- The "unlock" state is stored in `sessionStorage`, which is trivially manipulable.

**What should happen:** The password check should happen on the server. The API should never return the password field to non-admin users, and a separate endpoint (e.g., `POST /api/projects/[id]/unlock`) should accept a password, verify it server-side, and set a cookie or session flag granting access.

### 1.2 CSRF Protection Is Disabled (High)

**File:** `svelte.config.js:21-23`

```js
csrf: { checkOrigin: false }
```

CSRF (Cross-Site Request Forgery) is an attack where a malicious website tricks a logged-in user's browser into making requests to your site. SvelteKit has built-in protection that checks the `Origin` header on form submissions — but it's turned off here. This means a third-party site could craft a form that submits to your admin actions (delete project, toggle publish status, etc.) and the request would succeed if you're logged in.

**What should happen:** Re-enable `checkOrigin: true`. If it was disabled to work around a specific deployment issue (e.g., reverse proxy stripping the Origin header), the proper fix is to configure the proxy, not disable CSRF.

### 1.3 No Login Rate Limiting (High)

**File:** `src/routes/admin/login/+page.server.ts`

There's no limit on how many login attempts can be made. An attacker can try thousands of passwords per second with a simple script. The existing `ApiRateLimiter` class (`src/lib/server/rate-limiter.ts`) is only used for external API calls (Last.fm, PSN, etc.), not for login protection.

**What should happen:** Add rate limiting to the login endpoint — for example, allow 5 attempts per minute per IP address, then return a 429 (Too Many Requests) response with a backoff period.

### 1.4 No Security Headers (Medium)

**No `hooks.server.ts` exists**

The application has no server hooks file, which is where SvelteKit applications typically set security headers on every response. Missing headers include:

- **Content-Security-Policy (CSP):** Tells the browser which sources of scripts, styles, and images are allowed. Without it, injected scripts could execute freely.
- **X-Frame-Options:** Prevents the admin from being embedded in an iframe on another site (clickjacking attacks).
- **X-Content-Type-Options:** Prevents the browser from guessing file types (MIME sniffing).
- **Referrer-Policy:** Controls how much URL information is sent when navigating away.

**What should happen:** Create `src/hooks.server.ts` with a `handle` function that adds these headers to every response. This file is also the right place to centralize authentication checks and rate limiting.

### 1.5 Default Fallback Secrets (Medium)

**File:** `src/lib/server/admin/session.ts:15,73`

Both the session signing secret and admin password fall back to `'changeme'` if their environment variables aren't set:

```ts
process.env.ADMIN_SESSION_SECRET ?? 'changeme'
process.env.ADMIN_PASSWORD ?? 'changeme'
```

If the deployment environment is misconfigured (missing env vars), the admin becomes accessible with a known password. A startup check should verify these variables exist and refuse to start without them.

### 1.6 Admin Password Stored as Plain Text (Medium)

**File:** `src/lib/server/admin/session.ts:72-90`

The admin password is compared directly as a string (albeit using timing-safe comparison, which is good). Industry practice is to store a *hashed* version of the password using a slow hashing algorithm like bcrypt or argon2. This way, even if the environment variable is leaked, the actual password isn't immediately exposed.

For a single-user admin on a personal site this is lower-priority, but it becomes important if the same password is reused elsewhere.

### 1.7 Debug Endpoints Lack Auth Checks (Medium)

**Files:** `src/routes/api/admin/debug/clear-cache/+server.ts`, `src/routes/api/admin/debug/redis-keys/+server.ts`

These endpoints only check `if (!dev)` to block access — they don't call `checkAdminAuth()`. The `dev` flag is determined at build time by SvelteKit. If a development build accidentally runs in production, or the `dev` flag isn't correctly set, these endpoints expose Redis data and allow cache manipulation without authentication.

**What should happen:** Add `checkAdminAuth()` as the first check, *before* the `dev` gate. Defense in depth — multiple layers are better than one.

### 1.8 Open CORS on Upload Endpoint (Low)

**File:** `src/routes/api/media/upload/+server.ts:244-253`

The OPTIONS handler for file uploads returns `Access-Control-Allow-Origin: *`, meaning any website can make preflight requests to this endpoint. While the POST handler itself requires auth, the broad CORS policy is unnecessary.

A `corsHeaders` object in `api-utils.ts:80` also defines `Allow-Origin: *` with a comment "Update this in production." This should be locked down to the site's actual domain.

---

## 2. Infrastructure Improvements

### 2.1 Create a `hooks.server.ts` for Centralized Middleware

Currently, every API route independently calls `checkAdminAuth()`, and there's no shared place for security headers, logging, or rate limiting. SvelteKit's `hooks.server.ts` `handle` function runs on every request and is the natural place to:

- Add security headers to all responses
- Implement rate limiting on sensitive routes
- Add request logging
- Potentially centralize admin auth checks for `/api/admin/*` routes

This would reduce boilerplate and eliminate the risk of forgetting an auth check on a new endpoint.

### 2.2 Server-Side Input Validation with Zod

**Files:** `src/lib/schemas/project.ts` (exists), `src/routes/api/projects/+server.ts` (doesn't use it)

Zod schemas exist for project validation on the client side, but the API routes don't use them. The `parseRequestBody<T>()` function in `api-utils.ts` just parses JSON and casts it to a TypeScript type — this provides zero runtime safety. Any data the client sends is trusted and passed directly to Prisma.

**What should happen:** Share Zod schemas between client and server. On the server, validate the parsed body against the schema before using it:

```ts
const body = await parseRequestBody(event.request)
const result = projectSchema.safeParse(body)
if (!result.success) return errorResponse('Validation failed', 400)
```

This prevents malformed or malicious data from reaching the database, and co-locating schemas means validation rules stay in sync.

### 2.3 Standardize API Route Patterns

API routes use two different patterns for reading request bodies:

- **Pattern A:** `await parseRequestBody<Type>(event.request)` (projects)
- **Pattern B:** `await event.request.json()` with no error handling (posts)

The posts endpoint (`POST /api/posts`) calls `event.request.json()` directly. If the body isn't valid JSON, this throws an unhandled exception that results in a 500 error instead of a clean 400.

All routes should use the same body-parsing approach, ideally one that integrates Zod validation.

### 2.4 Deduplicate Media Usage Tracking

**Files:** `src/routes/api/projects/+server.ts`, `src/routes/api/projects/[id]/+server.ts`, `src/routes/api/posts/+server.ts`, `src/routes/api/posts/[id]/+server.ts`

Every API route that creates or updates content has ~30 lines of nearly identical media-usage-tracking code: extract IDs from each field, build reference arrays, call `trackMediaUsage`. This is repeated four times across projects and posts.

**What should happen:** Create a helper like `trackAllMediaUsage(contentType, contentId, data, fieldMappings)` that accepts a config object describing which fields to track. This would reduce each route's tracking code to a single function call and make it trivial to add tracking to new content types.

### 2.5 Wrap Bulk Operations in Database Transactions

**File:** `src/routes/api/media/bulk-delete/+server.ts`

Bulk delete operations delete from Cloudinary, clean up database references, and delete the media record — but these steps aren't wrapped in a database transaction. If one deletion fails midway (e.g., Cloudinary is down), the database could end up in an inconsistent state with orphaned records or dangling references.

**What should happen:** Use Prisma's `$transaction()` for the database operations, and handle Cloudinary failures separately with a cleanup queue or retry mechanism.

---

## 3. Business Logic Bugs

### 3.1 `GET /api/projects/[id]` Has No Auth Check

**File:** `src/routes/api/projects/[id]/+server.ts:45-65`

The GET handler for individual projects doesn't check authentication. This means anyone who knows (or guesses) a project ID can fetch its full data, including draft projects, password-protected projects (with the password field), and unpublished content. The list endpoint (`GET /api/projects`) correctly differentiates between admin and public access, but the individual endpoint doesn't.

**What should happen:** Either require auth for non-published projects, or strip sensitive fields (password, draft content) from the response for unauthenticated users.

### 3.2 Visiting `/admin/login` Logs Out Active Sessions

**File:** `src/routes/admin/login/+page.server.ts:5-7`

```ts
export const load = (async ({ cookies }) => {
  clearSessionCookie(cookies)  // Always clears, even if already logged in
```

The login page's `load` function unconditionally clears the session cookie. While the layout guard redirects authenticated users away from `/admin/login`, there's a brief window where the cookie is cleared before the redirect fires. If someone bookmarks `/admin/login` or navigates to it directly, their session is destroyed. This is especially surprising since the layout's redirect should handle this case — the `clearSessionCookie` call is redundant and harmful.

**What should happen:** Remove the unconditional `clearSessionCookie` from the login page load. The logout endpoint (`/admin/logout`) already handles explicit logouts. If the intent is to clear stale sessions, check whether the session is actually invalid first.

### 3.3 Concurrency Control Is Optional

**Files:** `src/routes/api/projects/[id]/+server.ts:101-106`, `src/routes/api/posts/[id]/+server.ts`

The optimistic concurrency check (comparing `updatedAt` timestamps to detect if someone else edited the record) only runs if the client sends an `updatedAt` field. If the client omits it, the check is silently skipped. This means:

- Older clients or API consumers that don't send `updatedAt` can silently overwrite newer changes.
- There's no server-enforced guarantee that edits won't collide.

**What should happen:** Either make `updatedAt` required on update requests (return 400 if missing), or always fetch the current record and include the timestamp in the response so the client always has it available.

### 3.4 Post Creation Returns Wrong Status Code

**File:** `src/routes/api/posts/+server.ts:177`

```ts
return jsonResponse(post)  // Returns 200
```

When a new post is successfully created, the endpoint returns HTTP 200 (OK) instead of 201 (Created). The project creation endpoint correctly returns 201. This is a minor inconsistency, but API consumers (and the admin UI's error handling) may rely on the distinction.

### 3.5 Slug Uniqueness Has a Race Condition

**File:** `src/lib/server/database.ts` (`ensureUniqueSlug` function)

The slug uniqueness check queries the database, then inserts separately. Under concurrent requests (e.g., two projects created at the same time with the same title), both could query, find no collision, and both try to insert the same slug. Whether this causes an error depends on whether there's a unique constraint on the slug column at the database level.

**What should happen:** Add a unique database constraint on slug columns if one doesn't exist, and handle the constraint violation error (Prisma P2002) gracefully by retrying with an incremented slug.

### 3.6 Error Messages May Leak Internal Details

**File:** `src/routes/api/media/upload/+server.ts:236-238`

```ts
return errorResponse(
  `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500
)
```

Several endpoints include the raw error message in the response. Depending on the error, this could expose internal paths, database schema details, or third-party API information. Error details should be logged server-side but returned to the client as a generic message.

---

## 4. Suggested Priority Order

1. **Fix project password protection** (client-side -> server-side) — currently any user can bypass it
2. **Re-enable CSRF protection** — one-line config change with large security impact
3. **Add `hooks.server.ts`** with security headers — foundational infrastructure
4. **Add login rate limiting** — prevents brute force attacks
5. **Remove default fallback secrets** — crash on missing env vars instead
6. **Fix `GET /api/projects/[id]` auth** — leaks draft/protected content
7. **Server-side Zod validation on API routes** — prevents malformed data
8. **Fix login page session clearing** — removes surprising logout behavior
9. **Add auth to debug endpoints** — defense in depth
10. **Standardize API patterns and deduplicate media tracking** — maintainability

---

## 5. Verification

After implementing fixes:
- Test login with wrong passwords, verify rate limiting kicks in
- Verify `/admin/login` doesn't log out an active session (open in a second tab)
- Confirm password-protected projects don't expose the password in API responses
- Check that `GET /api/projects/[id]` for a draft project returns 401/404 to unauthenticated users
- Verify security headers are present in responses (use browser dev tools Network tab)
- Try submitting a form action from a different origin to confirm CSRF blocking works
- Submit malformed JSON to API endpoints to verify Zod validation rejects it
- Create two projects with the same title simultaneously to test slug race condition handling
