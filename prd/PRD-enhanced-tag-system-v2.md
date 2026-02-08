# Product Requirements Document: Enhanced Tag System v2

## Executive Summary

Upgrade the current JSON-based tag system to a relational database model with advanced tagging features. This PRD incorporates all critical fixes and security considerations while maintaining the original vision of improved content organization, discoverability, and management.

**Key Improvements from v1:**
- Bulletproof data integrity and validation
- Security-hardened implementation
- Clear migration strategy for single-user context
- Realistic 10-12 week timeline with comprehensive testing
- Simplified scope (removed analytics, colors, undo features)

---

## Goals

### Primary Goals
- Enable efficient querying and filtering of posts by tags
- Provide tag management capabilities for content curation
- Show related posts based on shared tags
- Implement intuitive tag input with typeahead and keyboard shortcuts
- Maintain data integrity during migration

### Non-Goals (Deferred to Future Versions)
- Tag analytics and usage statistics
- Tag color coding
- Hierarchical tags (parent/child relationships)
- Auto-tagging with ML
- Audit logging
- Import/export functionality
- Undo functionality

---

## Technical Constraints

- **Framework**: SvelteKit with Svelte 5 runes mode
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis (existing infrastructure)
- **Hosting**: Railway (existing infrastructure)
- **Design System**: Use existing admin component library
- **Performance Target**: Tag operations < 100ms, with Redis caching
- **Context**: Single-user application (no rate limiting needed)

---

## Current State vs Target State

### Current Implementation
- Tags stored as JSON arrays: `tags: ['announcement', 'meta', 'cms']`
- Simple display-only functionality
- No querying capabilities
- Manual tag input with Add button
- No data validation

### Target Implementation
- Relational many-to-many tag system
- Full CRUD operations for tags
- Advanced filtering and search
- Typeahead tag input with keyboard navigation
- Tag merge functionality
- Related posts based on shared tags
- Comprehensive data validation and security

---

## Database Schema

### Design Principles
- **Data Integrity**: Enforce constraints at database level
- **Case Insensitivity**: Tag names unique case-insensitively
- **Hard Deletes**: No soft deletes (single-user context)
- **Simplicity**: No analytics table, calculate usage on-demand

### Schema Definition

```prisma
model Tag {
  id          Int       @id @default(autoincrement())
  name        String    @unique @db.VarChar(100)
  displayName String    @db.VarChar(100)  // Preserves original casing
  slug        String    @unique @db.VarChar(100)
  description String?   @db.Text
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  posts       PostTag[]

  @@index([name])
  @@index([slug])
  @@map("tags")
}

model PostTag {
  id        Int      @id @default(autoincrement())
  postId    Int
  tagId     Int
  createdAt DateTime @default(now())

  // Relations
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([postId, tagId])
  @@index([postId])
  @@index([tagId])
  @@map("post_tags")
}

// Update existing Post model
model Post {
  // ... existing fields
  tags      PostTag[]  // Replace: tags Json?
}
```

### SQL Migration

```sql
-- 1. Create tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create post_tags junction table
CREATE TABLE post_tags (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, tag_id)
);

-- 3. Indexes for performance
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);

-- 4. Full-text search support (PostgreSQL)
ALTER TABLE tags ADD COLUMN search_vector tsvector;
CREATE INDEX idx_tags_search ON tags USING GIN(search_vector);

CREATE TRIGGER tags_search_update
BEFORE INSERT OR UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description);
```

---

## Data Validation Rules

### Tag Name Validation

**Server-side validation** (required - client-side is advisory only):

```typescript
const TAG_VALIDATION = {
  minLength: 2,
  maxLength: 50,
  dbMaxLength: 100,  // Safety margin
  pattern: /^[a-zA-Z0-9\s-]+$/,  // Letters, numbers, spaces, hyphens
  reservedWords: [
    'admin', 'api', 'new', 'edit', 'delete',
    'create', 'update', 'tags', 'posts'
  ],
  maxWords: 5  // Prevent essay-length tags
}

function validateTagName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim()

  // Length check
  if (trimmed.length < TAG_VALIDATION.minLength) {
    return { valid: false, error: 'Tag name must be at least 2 characters' }
  }
  if (trimmed.length > TAG_VALIDATION.maxLength) {
    return { valid: false, error: 'Tag name must be at most 50 characters' }
  }

  // Character whitelist
  if (!TAG_VALIDATION.pattern.test(trimmed)) {
    return { valid: false, error: 'Tag name contains invalid characters. Only letters, numbers, spaces, and hyphens allowed.' }
  }

  // Word count
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount > TAG_VALIDATION.maxWords) {
    return { valid: false, error: `Tag name cannot exceed ${TAG_VALIDATION.maxWords} words` }
  }

  // Reserved words
  const normalized = trimmed.toLowerCase()
  if (TAG_VALIDATION.reservedWords.includes(normalized)) {
    return { valid: false, error: 'This tag name is reserved and cannot be used' }
  }

  return { valid: true }
}
```

### Slug Generation

```typescript
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]+/g, '')  // Remove invalid chars
    .replace(/\s+/g, '-')            // Spaces to hyphens
    .replace(/-+/g, '-')             // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
}

async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name)
  let slug = baseSlug
  let counter = 2

  // Handle conflicts by appending counter
  while (await prisma.tag.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}
```

### Case Insensitivity

Tags are case-insensitive for uniqueness but preserve display casing:

```typescript
async function createTag(name: string, description?: string) {
  const normalized = name.toLowerCase().trim()

  // Check for existing tag (case-insensitive)
  const existing = await prisma.tag.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } }
  })

  if (existing) {
    throw new Error('A tag with this name already exists')
  }

  const slug = await generateUniqueSlug(name)

  return await prisma.tag.create({
    data: {
      name: normalized,
      displayName: name.trim(),  // Preserve original casing
      slug,
      description: description?.trim()
    }
  })
}
```

### Input Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

const createTagSchema = z.object({
  name: z.string()
    .min(2, 'Tag name must be at least 2 characters')
    .max(50, 'Tag name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Tag name contains invalid characters')
    .transform(val => DOMPurify.sanitize(val.trim(), { ALLOWED_TAGS: [] })),
  description: z.string()
    .max(500, 'Description too long')
    .optional()
    .transform(val => val ? DOMPurify.sanitize(val.trim()) : undefined)
})

const updateTagSchema = z.object({
  name: z.string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9\s-]+$/)
    .transform(val => DOMPurify.sanitize(val.trim(), { ALLOWED_TAGS: [] }))
    .optional(),
  description: z.string()
    .max(500)
    .optional()
    .transform(val => val ? DOMPurify.sanitize(val.trim()) : undefined)
})
```

---

## API Specification

### Authentication

- **Public endpoints** (read-only):
  - `GET /api/tags` - List all tags
  - `GET /api/tags/suggest` - Tag suggestions
  - `GET /api/tags/[slug]` - Get single tag
  - `GET /api/posts?tags=...` - Filter posts by tags

- **Admin-only endpoints** (mutations):
  - `POST /api/tags` - Create tag
  - `PUT /api/tags/[id]` - Update tag
  - `DELETE /api/tags/[id]` - Delete tag
  - `POST /api/tags/merge` - Merge tags
  - `POST /api/posts/bulk/tags` - Bulk tag operations

All admin endpoints use existing `checkAdminAuth()` middleware.

### Error Response Format

```typescript
interface ApiError {
  error: {
    code: string           // "TAG_NAME_INVALID"
    message: string        // Human-readable message
    field?: string         // Which field caused error
    details?: unknown      // Additional context
  }
  status: number          // HTTP status code
}

// Common error codes:
// 400 - TAG_NAME_TOO_LONG
// 400 - TAG_NAME_INVALID_CHARS
// 400 - TAG_NAME_RESERVED
// 409 - TAG_ALREADY_EXISTS
// 404 - TAG_NOT_FOUND
// 422 - TAG_IN_USE_CANNOT_DELETE (if we add this check)
```

### Endpoints

#### GET /api/tags

List all tags with pagination and search.

**Query Parameters:**
```typescript
interface TagsQueryParams {
  page?: number        // Default: 1
  limit?: number       // Default: 50, max: 100
  sort?: 'name' | 'usage' | 'recent'  // Default: 'name'
  order?: 'asc' | 'desc'              // Default: 'asc'
  search?: string      // Filter by name (uses full-text search)
}
```

**Response:**
```typescript
interface TagsResponse {
  tags: Array<{
    id: number
    name: string
    displayName: string
    slug: string
    description: string | null
    usageCount: number  // Calculated via COUNT
    createdAt: string
    updatedAt: string
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

**Implementation:**
```typescript
export const GET: RequestHandler = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
  const sort = url.searchParams.get('sort') ?? 'name'
  const order = url.searchParams.get('order') ?? 'asc'
  const search = url.searchParams.get('search')

  // Try cache first
  const cacheKey = `tags:list:${page}:${limit}:${sort}:${order}:${search ?? ''}`
  const cached = await redis.get(cacheKey)
  if (cached) return json(JSON.parse(cached))

  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  } : {}

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: sort === 'usage'
        ? { posts: { _count: order } }
        : { [sort]: order },
      include: {
        _count: {
          select: { posts: true }
        }
      }
    }),
    prisma.tag.count({ where })
  ])

  const response = {
    tags: tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      displayName: tag.displayName,
      slug: tag.slug,
      description: tag.description,
      usageCount: tag._count.posts,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString()
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  }

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(response))

  return json(response)
}
```

#### GET /api/tags/suggest

Typeahead suggestions for tag input.

**Query Parameters:**
```typescript
interface SuggestParams {
  q: string       // Query string (min 2 chars)
  limit?: number  // Max suggestions (default: 5)
}
```

**Response:**
```typescript
interface SuggestResponse {
  suggestions: Array<{
    id: number
    name: string
    displayName: string
    slug: string
    usageCount: number
  }>
}
```

**Implementation:**
```typescript
export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('q')
  const limit = parseInt(url.searchParams.get('limit') ?? '5')

  if (!query || query.length < 2) {
    return json({ suggestions: [] })
  }

  // Cache suggestions for 2 minutes
  const cacheKey = `tags:suggest:${query}:${limit}`
  const cached = await redis.get(cacheKey)
  if (cached) return json(JSON.parse(cached))

  const tags = await prisma.tag.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive'
      }
    },
    take: limit,
    orderBy: [
      { posts: { _count: 'desc' } },  // Popular tags first
      { name: 'asc' }
    ],
    include: {
      _count: {
        select: { posts: true }
      }
    }
  })

  const response = {
    suggestions: tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      displayName: tag.displayName,
      slug: tag.slug,
      usageCount: tag._count.posts
    }))
  }

  await redis.setex(cacheKey, 120, JSON.stringify(response))
  return json(response)
}
```

#### POST /api/tags

Create a new tag.

**Request:**
```typescript
interface CreateTagRequest {
  name: string
  description?: string
}
```

**Response:** `201 Created`
```typescript
interface CreateTagResponse {
  tag: {
    id: number
    name: string
    displayName: string
    slug: string
    description: string | null
    createdAt: string
    updatedAt: string
  }
}
```

**Implementation:**
```typescript
export const POST: RequestHandler = async ({ request }) => {
  // Auth check
  if (!checkAdminAuth(event)) {
    return json({ error: { code: 'UNAUTHORIZED', message: 'Admin access required' } }, { status: 401 })
  }

  const body = await request.json()

  // Validate input
  const result = createTagSchema.safeParse(body)
  if (!result.success) {
    return json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: result.error.format()
      }
    }, { status: 400 })
  }

  const { name, description } = result.data

  // Additional validation
  const validation = validateTagName(name)
  if (!validation.valid) {
    return json({
      error: {
        code: 'TAG_NAME_INVALID',
        message: validation.error,
        field: 'name'
      }
    }, { status: 400 })
  }

  try {
    const tag = await createTag(name, description)

    // Invalidate cache
    await redis.del('tags:list:*')

    return json({ tag }, { status: 201 })
  } catch (error) {
    if (error.message.includes('already exists')) {
      return json({
        error: {
          code: 'TAG_ALREADY_EXISTS',
          message: 'A tag with this name already exists',
          field: 'name'
        }
      }, { status: 409 })
    }
    throw error
  }
}
```

#### PUT /api/tags/[id]

Update an existing tag.

**Request:**
```typescript
interface UpdateTagRequest {
  name?: string
  description?: string
}
```

**Response:** `200 OK`

**Implementation:**
```typescript
export const PUT: RequestHandler = async ({ params, request }) => {
  if (!checkAdminAuth(event)) {
    return json({ error: { code: 'UNAUTHORIZED', message: 'Admin access required' } }, { status: 401 })
  }

  const tagId = parseInt(params.id)
  const body = await request.json()

  const result = updateTagSchema.safeParse(body)
  if (!result.success) {
    return json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: result.error.format()
      }
    }, { status: 400 })
  }

  const updates = result.data

  // If updating name, validate and regenerate slug
  if (updates.name) {
    const validation = validateTagName(updates.name)
    if (!validation.valid) {
      return json({
        error: {
          code: 'TAG_NAME_INVALID',
          message: validation.error,
          field: 'name'
        }
      }, { status: 400 })
    }

    const normalized = updates.name.toLowerCase().trim()
    const slug = await generateUniqueSlug(updates.name)

    updates.name = normalized
    updates.displayName = updates.name.trim()
    updates.slug = slug
  }

  try {
    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: updates
    })

    // Invalidate cache
    await redis.del('tags:list:*')
    await redis.del(`tags:${tagId}`)

    return json({ tag })
  } catch (error) {
    if (error.code === 'P2025') {
      return json({
        error: {
          code: 'TAG_NOT_FOUND',
          message: 'Tag not found'
        }
      }, { status: 404 })
    }
    throw error
  }
}
```

#### DELETE /api/tags/[id]

Delete a tag and remove it from all posts (CASCADE).

**Response:** `204 No Content`

**Implementation:**
```typescript
export const DELETE: RequestHandler = async ({ params }) => {
  if (!checkAdminAuth(event)) {
    return json({ error: { code: 'UNAUTHORIZED', message: 'Admin access required' } }, { status: 401 })
  }

  const tagId = parseInt(params.id)

  try {
    // Delete will cascade to post_tags automatically
    await prisma.tag.delete({
      where: { id: tagId }
    })

    // Invalidate cache
    await redis.del('tags:list:*')
    await redis.del(`tags:${tagId}`)
    await redis.del('related:*')  // Related posts cache

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error.code === 'P2025') {
      return json({
        error: {
          code: 'TAG_NOT_FOUND',
          message: 'Tag not found'
        }
      }, { status: 404 })
    }
    throw error
  }
}
```

#### POST /api/tags/merge

Merge multiple tags into a single target tag.

**Request:**
```typescript
interface MergeTagsRequest {
  sourceTagIds: number[]  // Tags to merge (will be deleted)
  targetTagId: number     // Tag to merge into (will remain)
}
```

**Response:** `200 OK`

**Implementation:**
```typescript
export const POST: RequestHandler = async ({ request }) => {
  if (!checkAdminAuth(event)) {
    return json({ error: { code: 'UNAUTHORIZED', message: 'Admin access required' } }, { status: 401 })
  }

  const { sourceTagIds, targetTagId } = await request.json()

  if (!Array.isArray(sourceTagIds) || sourceTagIds.length === 0) {
    return json({
      error: {
        code: 'INVALID_INPUT',
        message: 'sourceTagIds must be a non-empty array'
      }
    }, { status: 400 })
  }

  if (sourceTagIds.includes(targetTagId)) {
    return json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Cannot merge a tag into itself'
      }
    }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update all post_tags pointing to sources → point to target
      await tx.postTag.updateMany({
        where: { tagId: { in: sourceTagIds } },
        data: { tagId: targetTagId }
      })

      // 2. Remove duplicates (same post, same tag after merge)
      await tx.$executeRaw`
        DELETE FROM post_tags a
        USING post_tags b
        WHERE a.id > b.id
        AND a.post_id = b.post_id
        AND a.tag_id = b.tag_id
      `

      // 3. Delete source tags
      await tx.tag.deleteMany({
        where: { id: { in: sourceTagIds } }
      })
    })

    // Invalidate all caches
    await redis.flushdb()

    return json({ success: true })
  } catch (error) {
    return json({
      error: {
        code: 'MERGE_FAILED',
        message: 'Failed to merge tags',
        details: error.message
      }
    }, { status: 500 })
  }
}
```

#### POST /api/posts/bulk/tags

Add or remove tags from multiple posts at once.

**Request:**
```typescript
interface BulkTagRequest {
  postIds: number[]
  tagIds: number[]
  operation: 'add' | 'remove'
}
```

**Response:** `200 OK`

**Implementation:**
```typescript
export const POST: RequestHandler = async ({ request }) => {
  if (!checkAdminAuth(event)) {
    return json({ error: { code: 'UNAUTHORIZED', message: 'Admin access required' } }, { status: 401 })
  }

  const { postIds, tagIds, operation } = await request.json()

  if (!['add', 'remove'].includes(operation)) {
    return json({
      error: {
        code: 'INVALID_OPERATION',
        message: 'Operation must be "add" or "remove"'
      }
    }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (operation === 'add') {
        // Add tags to posts (upsert to avoid duplicates)
        for (const postId of postIds) {
          for (const tagId of tagIds) {
            await tx.postTag.upsert({
              where: {
                postId_tagId: { postId, tagId }
              },
              create: { postId, tagId },
              update: {}
            })
          }
        }
      } else {
        // Remove tags from posts
        await tx.postTag.deleteMany({
          where: {
            postId: { in: postIds },
            tagId: { in: tagIds }
          }
        })
      }
    })

    // Invalidate cache
    await redis.del('related:*')

    return json({ success: true })
  } catch (error) {
    return json({
      error: {
        code: 'BULK_OPERATION_FAILED',
        message: 'Failed to update tags',
        details: error.message
      }
    }, { status: 500 })
  }
}
```

#### GET /api/posts/related

Get related posts based on shared tags.

**Query Parameters:**
```typescript
interface RelatedPostsParams {
  postId: number    // Current post ID
  tagIds: string    // Comma-separated tag IDs
  limit?: number    // Max posts (default: 3)
}
```

**Response:**
```typescript
interface RelatedPostsResponse {
  posts: Array<{
    id: number
    title: string
    slug: string
    excerpt: string | null
    publishedAt: string
    tags: Array<{
      id: number
      name: string
      displayName: string
      slug: string
    }>
    sharedTagsCount: number
  }>
}
```

**Implementation:**
```typescript
export const GET: RequestHandler = async ({ url }) => {
  const postId = parseInt(url.searchParams.get('postId') ?? '0')
  const tagIds = url.searchParams.get('tagIds')?.split(',').map(Number) ?? []
  const limit = parseInt(url.searchParams.get('limit') ?? '3')

  if (!postId || tagIds.length === 0) {
    return json({ posts: [] })
  }

  // Cache for 5 minutes
  const cacheKey = `related:${postId}:${tagIds.join('-')}:${limit}`
  const cached = await redis.get(cacheKey)
  if (cached) return json(JSON.parse(cached))

  // Efficient related posts query
  const relatedPosts = await prisma.$queryRaw`
    WITH shared_tags AS (
      SELECT
        pt2.post_id,
        COUNT(*) as shared_count
      FROM post_tags pt1
      JOIN post_tags pt2 ON pt1.tag_id = pt2.tag_id
      WHERE pt1.post_id = ${postId}
        AND pt2.post_id != ${postId}
      GROUP BY pt2.post_id
    )
    SELECT
      p.id,
      p.title,
      p.slug,
      p.excerpt,
      p.published_at,
      st.shared_count
    FROM posts p
    JOIN shared_tags st ON p.id = st.post_id
    WHERE p.status = 'published'
      AND p.deleted_at IS NULL
    ORDER BY st.shared_count DESC, p.published_at DESC
    LIMIT ${limit}
  `

  // Fetch tags for each related post
  const postsWithTags = await Promise.all(
    relatedPosts.map(async (post) => {
      const tags = await prisma.tag.findMany({
        where: {
          posts: {
            some: { postId: post.id }
          }
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          slug: true
        }
      })

      return {
        ...post,
        tags,
        publishedAt: post.published_at.toISOString()
      }
    })
  )

  const response = { posts: postsWithTags }
  await redis.setex(cacheKey, 300, JSON.stringify(response))

  return json(response)
}
```

#### GET /api/posts

Enhanced with tag filtering.

**Query Parameters:**
```typescript
interface PostsQueryParams {
  tags?: string      // Comma-separated tag slugs or IDs
  page?: number
  limit?: number
  status?: 'published' | 'draft'
}
```

**Note:** Multiple tags use OR logic (posts with ANY of the tags).

**Implementation:**
```typescript
export const GET: RequestHandler = async ({ url }) => {
  const tagFilter = url.searchParams.get('tags')
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = parseInt(url.searchParams.get('limit') ?? '20')
  const status = url.searchParams.get('status')

  const where: any = {}

  if (status) {
    where.status = status
  }

  // Tag filtering (OR logic)
  if (tagFilter) {
    const tagSlugs = tagFilter.split(',')
    where.tags = {
      some: {
        tag: {
          slug: { in: tagSlugs }
        }
      }
    }
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                displayName: true,
                slug: true
              }
            }
          }
        }
      }
    }),
    prisma.post.count({ where })
  ])

  return json({
    posts: posts.map(post => ({
      ...post,
      tags: post.tags.map(pt => pt.tag)
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  })
}
```

---

## Frontend Components

### TagInput Component

**File:** `src/lib/components/admin/TagInput.svelte`

**Features:**
- Typeahead search with debouncing (200ms)
- Keyboard navigation (Arrow up/down, Enter, Escape, Backspace)
- Inline tag creation (press Enter on non-existent tag)
- Visual tag pills with remove buttons
- Loading states for async operations
- Accessibility (ARIA labels, keyboard support)
- Maximum 5 suggestions shown

**Component API:**

```typescript
interface TagInputProps {
  tags?: Tag[]                    // Current tags (bindable)
  placeholder?: string            // Input placeholder
  maxTags?: number                // Maximum allowed tags
  disabled?: boolean              // Disable input
  onTagAdd?: (tag: Tag) => void   // Callback when tag added
  onTagRemove?: (tag: Tag) => void // Callback when tag removed
}

interface Tag {
  id: number
  name: string
  displayName: string
  slug: string
}
```

**Implementation:**

```svelte
<script lang="ts">
  import { debounce } from '$lib/utils/debounce'

  let {
    tags = $bindable([]),
    placeholder = 'Add tags...',
    maxTags = 10,
    disabled = false,
    onTagAdd,
    onTagRemove
  }: TagInputProps = $props()

  let inputValue = $state('')
  let showSuggestions = $state(false)
  let selectedIndex = $state(-1)
  let suggestions = $state<Tag[]>([])
  let isLoadingSuggestions = $state(false)
  let inputElement: HTMLInputElement

  // Filtered suggestions (exclude already added tags)
  let filteredSuggestions = $derived(
    suggestions.filter(tag => !tags.some(t => t.id === tag.id))
  )

  // Debounced suggestion fetching
  const fetchSuggestions = debounce(async (query: string) => {
    if (query.length < 2) {
      suggestions = []
      return
    }

    isLoadingSuggestions = true
    try {
      const res = await fetch(`/api/tags/suggest?q=${encodeURIComponent(query)}&limit=5`)
      const data = await res.json()
      suggestions = data.suggestions
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      suggestions = []
    } finally {
      isLoadingSuggestions = false
    }
  }, 200)

  // Handle input changes
  function handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value
    inputValue = value
    selectedIndex = -1
    showSuggestions = value.length >= 2

    if (value.length >= 2) {
      fetchSuggestions(value)
    } else {
      suggestions = []
    }
  }

  // Add existing tag from suggestions
  async function addExistingTag(tag: Tag) {
    if (tags.length >= maxTags) return

    tags = [...tags, tag]
    onTagAdd?.(tag)

    inputValue = ''
    suggestions = []
    showSuggestions = false
    selectedIndex = -1
    inputElement?.focus()
  }

  // Create and add new tag
  async function createNewTag(name: string) {
    if (tags.length >= maxTags) return

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'same-origin'
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error.message)
        return
      }

      const { tag } = await res.json()
      tags = [...tags, tag]
      onTagAdd?.(tag)

      inputValue = ''
      showSuggestions = false
      inputElement?.focus()
    } catch (error) {
      console.error('Failed to create tag:', error)
      alert('Failed to create tag. Please try again.')
    }
  }

  // Remove tag
  function removeTag(tag: Tag) {
    tags = tags.filter(t => t.id !== tag.id)
    onTagRemove?.(tag)
  }

  // Keyboard navigation
  function handleKeydown(e: KeyboardEvent) {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          addExistingTag(filteredSuggestions[selectedIndex])
        } else if (inputValue.trim()) {
          createNewTag(inputValue.trim())
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        if (showSuggestions && filteredSuggestions.length > 0) {
          selectedIndex = Math.min(selectedIndex + 1, filteredSuggestions.length - 1)
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (showSuggestions) {
          selectedIndex = Math.max(selectedIndex - 1, -1)
        }
        break

      case 'Backspace':
        if (!inputValue && tags.length > 0) {
          removeTag(tags[tags.length - 1])
        }
        break

      case 'Escape':
        showSuggestions = false
        selectedIndex = -1
        inputElement?.blur()
        break
    }
  }

  // Click outside to close
  function handleClickOutside(e: MouseEvent) {
    if (!(e.target as Element).closest('.tag-input-container')) {
      showSuggestions = false
      selectedIndex = -1
    }
  }

  $effect(() => {
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  })
</script>

<div class="tag-input-container">
  <!-- Tag pills -->
  <div class="tag-pills">
    {#each tags as tag (tag.id)}
      <span class="tag-pill">
        {tag.displayName}
        <button
          type="button"
          onclick={() => removeTag(tag)}
          aria-label="Remove {tag.displayName}"
          disabled={disabled}
        >
          ×
        </button>
      </span>
    {/each}

    <!-- Input -->
    {#if tags.length < maxTags}
      <input
        bind:this={inputElement}
        type="text"
        bind:value={inputValue}
        oninput={handleInput}
        onkeydown={handleKeydown}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        class="tag-input"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-haspopup="listbox"
        aria-controls="tag-suggestions"
        aria-activedescendant={selectedIndex >= 0 ? `tag-option-${selectedIndex}` : undefined}
        aria-label="Add tags"
      />
    {/if}
  </div>

  <!-- Suggestions dropdown -->
  {#if showSuggestions}
    <div class="tag-suggestions" id="tag-suggestions" role="listbox">
      {#if isLoadingSuggestions}
        <div class="suggestion-loading">
          <span class="spinner"></span>
          Searching...
        </div>
      {:else if filteredSuggestions.length > 0}
        {#each filteredSuggestions as tag, i (tag.id)}
          <button
            type="button"
            class="suggestion-item"
            class:selected={selectedIndex === i}
            onclick={() => addExistingTag(tag)}
            id="tag-option-{i}"
            role="option"
            aria-selected={selectedIndex === i}
          >
            <span class="suggestion-name">{tag.displayName}</span>
            <span class="suggestion-count">{tag.usageCount}</span>
          </button>
        {/each}
      {:else}
        <div class="suggestion-empty">
          No matching tags
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  @import '$styles/variables';

  .tag-input-container {
    position: relative;
    width: 100%;
  }

  .tag-pills {
    display: flex;
    flex-wrap: wrap;
    gap: $unit-half;
    padding: $unit;
    border: 1px solid $gray-85;
    border-radius: $corner-radius-sm;
    background: $white;
    min-height: 40px;
    align-items: center;

    &:focus-within {
      outline: none;
      border-color: $blue-50;
      box-shadow: 0 0 0 3px rgba($blue-50, 0.1);
    }
  }

  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: $unit-half;
    padding: 4px $unit;
    background: $gray-90;
    border-radius: $corner-radius-sm;
    font-size: 14px;
    color: $gray-20;

    button {
      border: none;
      background: none;
      color: $gray-40;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: $gray-10;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }
  }

  .tag-input {
    flex: 1;
    border: none;
    outline: none;
    background: none;
    font-size: 14px;
    min-width: 120px;

    &::placeholder {
      color: $gray-60;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  .tag-suggestions {
    position: absolute;
    top: calc(100% + $unit-half);
    left: 0;
    right: 0;
    z-index: 100;
    background: $white;
    border: 1px solid $gray-85;
    border-radius: $corner-radius-sm;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    max-height: 200px;
    overflow-y: auto;
  }

  .suggestion-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: $unit $unit-2x;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    font-size: 14px;

    &:hover,
    &.selected {
      background: $gray-95;
    }
  }

  .suggestion-name {
    color: $gray-10;
  }

  .suggestion-count {
    color: $gray-60;
    font-size: 12px;
  }

  .suggestion-loading,
  .suggestion-empty {
    padding: $unit-2x;
    text-align: center;
    color: $gray-60;
    font-size: 14px;
  }

  .suggestion-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $unit;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid $gray-90;
    border-top-color: $blue-50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
```

### TagPill Component

**File:** `src/lib/components/TagPill.svelte`

Simple read-only tag display for public pages.

```svelte
<script lang="ts">
  interface TagPillProps {
    tag: {
      name: string
      displayName: string
      slug: string
    }
    size?: 'small' | 'medium' | 'large'
    clickable?: boolean
    href?: string
  }

  let {
    tag,
    size = 'medium',
    clickable = false,
    href
  }: TagPillProps = $props()
</script>

{#if href}
  <a
    href={href}
    class="tag-pill tag-pill-{size}"
    class:clickable
  >
    {tag.displayName}
  </a>
{:else}
  <span
    class="tag-pill tag-pill-{size}"
    class:clickable
  >
    {tag.displayName}
  </span>
{/if}

<style lang="scss">
  @import '$styles/variables';

  .tag-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px $unit;
    background: $gray-90;
    border-radius: $corner-radius-sm;
    font-size: 14px;
    color: $gray-20;
    text-decoration: none;
    white-space: nowrap;

    &.clickable {
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: $gray-80;
        color: $gray-10;
      }
    }

    &.tag-pill-small {
      font-size: 12px;
      padding: 2px $unit-half;
    }

    &.tag-pill-large {
      font-size: 16px;
      padding: $unit-half $unit-2x;
    }
  }
</style>
```

### RelatedPosts Component

**File:** `src/lib/components/RelatedPosts.svelte`

Shows related posts based on shared tags.

```svelte
<script lang="ts">
  import TagPill from './TagPill.svelte'

  interface RelatedPostsProps {
    postId: number
    tags: Array<{ id: number }>
    limit?: number
  }

  let {
    postId,
    tags,
    limit = 3
  }: RelatedPostsProps = $props()

  let relatedPosts = $state<any[]>([])
  let isLoading = $state(true)
  let error = $state<string | null>(null)

  $effect(() => {
    async function fetchRelatedPosts() {
      if (tags.length === 0) {
        relatedPosts = []
        isLoading = false
        return
      }

      try {
        isLoading = true
        const tagIds = tags.map(t => t.id).join(',')
        const res = await fetch(
          `/api/posts/related?postId=${postId}&tagIds=${tagIds}&limit=${limit}`
        )

        if (!res.ok) throw new Error('Failed to fetch related posts')

        const data = await res.json()
        relatedPosts = data.posts
        error = null
      } catch (err) {
        console.error('Error fetching related posts:', err)
        error = 'Failed to load related posts'
        relatedPosts = []
      } finally {
        isLoading = false
      }
    }

    fetchRelatedPosts()
  })
</script>

{#if isLoading}
  <div class="related-posts-loading">
    <span class="spinner"></span>
    Loading related posts...
  </div>
{:else if error}
  <div class="related-posts-error">
    {error}
  </div>
{:else if relatedPosts.length > 0}
  <section class="related-posts">
    <h2>Related Posts</h2>
    <div class="related-posts-grid">
      {#each relatedPosts as post (post.id)}
        <article class="related-post-card">
          <a href="/posts/{post.slug}" class="related-post-link">
            <h3>{post.title}</h3>
            {#if post.excerpt}
              <p class="excerpt">{post.excerpt}</p>
            {/if}
            <div class="post-tags">
              {#each post.tags as tag (tag.id)}
                <TagPill {tag} size="small" />
              {/each}
            </div>
            <time datetime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString()}
            </time>
          </a>
        </article>
      {/each}
    </div>
  </section>
{/if}

<style lang="scss">
  @import '$styles/variables';

  .related-posts {
    margin: $unit-6x 0;

    h2 {
      font-size: 1.5rem;
      margin-bottom: $unit-3x;
    }
  }

  .related-posts-grid {
    display: grid;
    gap: $unit-3x;

    @media (min-width: 768px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .related-post-card {
    border: 1px solid $gray-85;
    border-radius: $corner-radius-md;
    overflow: hidden;
    transition: all 0.2s ease;

    &:hover {
      border-color: $gray-70;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .related-post-link {
    display: block;
    padding: $unit-3x;
    text-decoration: none;
    color: inherit;

    h3 {
      font-size: 1.125rem;
      margin-bottom: $unit;
      color: $gray-10;
    }

    .excerpt {
      color: $gray-40;
      font-size: 0.875rem;
      margin-bottom: $unit-2x;
      line-height: 1.5;
    }

    .post-tags {
      display: flex;
      flex-wrap: wrap;
      gap: $unit-half;
      margin-bottom: $unit;
    }

    time {
      display: block;
      color: $gray-60;
      font-size: 0.75rem;
    }
  }

  .related-posts-loading,
  .related-posts-error {
    padding: $unit-3x;
    text-align: center;
    color: $gray-60;
  }

  .related-posts-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $unit;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid $gray-90;
    border-top-color: $blue-50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
```

### Admin Tag Manager

**File:** `src/routes/admin/tags/+page.svelte`

Admin interface for managing all tags.

**Features:**
- List all tags with usage counts
- Search and filter
- Edit tag name/description
- Merge tags
- Delete tags
- Bulk operations

**Implementation:** See Phase 3 for detailed component specification.

---

## Migration Strategy

### Context

Single-user application, so migration complexity is minimal. No need for complex dual-write systems or gradual rollouts.

### Pre-Migration Steps

1. **Backup database**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Audit existing tags**
   ```typescript
   // Script: scripts/audit-tags.ts
   async function auditExistingTags() {
     const posts = await prisma.post.findMany()
     const issues = {
       invalidTags: [],
       tooLong: [],
       specialChars: [],
       duplicates: new Map<string, string[]>(),
       empty: []
     }

     const allTags = new Map<string, Set<string>>()

     posts.forEach(post => {
       const tags = post.tags as string[]
       if (!Array.isArray(tags)) return

       tags.forEach(tag => {
         if (typeof tag !== 'string') {
           issues.invalidTags.push({ postId: post.id, tag })
           return
         }

         const trimmed = tag.trim()
         if (!trimmed) {
           issues.empty.push({ postId: post.id })
           return
         }

         if (trimmed.length > 50) {
           issues.tooLong.push({ postId: post.id, tag: trimmed })
         }

         if (!/^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
           issues.specialChars.push({ postId: post.id, tag: trimmed })
         }

         // Track duplicates (case-insensitive)
         const normalized = trimmed.toLowerCase()
         if (!allTags.has(normalized)) {
           allTags.set(normalized, new Set())
         }
         allTags.get(normalized)!.add(trimmed)
       })
     })

     // Find case duplicates
     allTags.forEach((variants, normalized) => {
       if (variants.size > 1) {
         issues.duplicates.set(normalized, Array.from(variants))
       }
     })

     console.log('Audit Results:')
     console.log(`Total unique tags: ${allTags.size}`)
     console.log(`Invalid tags: ${issues.invalidTags.length}`)
     console.log(`Too long: ${issues.tooLong.length}`)
     console.log(`Special chars: ${issues.specialChars.length}`)
     console.log(`Duplicates: ${issues.duplicates.size}`)
     console.log(`Empty: ${issues.empty.length}`)

     if (issues.duplicates.size > 0) {
       console.log('\nDuplicate tags (case variations):')
       issues.duplicates.forEach((variants, normalized) => {
         console.log(`  ${normalized}: ${Array.from(variants).join(', ')}`)
       })
     }

     return issues
   }
   ```

3. **Fix data issues** (if any found in audit)

### Migration Script

```typescript
// Script: prisma/migrations/migrate-tags.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateTags() {
  console.log('Starting tag migration...')

  // 1. Get all posts with JSON tags
  const posts = await prisma.post.findMany({
    where: {
      tags: { not: null }
    }
  })

  console.log(`Found ${posts.length} posts with tags`)

  // 2. Extract unique tags
  const uniqueTags = new Map<string, string>()  // normalized -> displayName

  posts.forEach(post => {
    const tags = post.tags as string[]
    if (!Array.isArray(tags)) return

    tags.forEach(tag => {
      if (typeof tag !== 'string') return

      const trimmed = tag.trim()
      if (!trimmed) return

      const normalized = trimmed.toLowerCase()

      // Keep first occurrence's casing
      if (!uniqueTags.has(normalized)) {
        uniqueTags.set(normalized, trimmed)
      }
    })
  })

  console.log(`Found ${uniqueTags.size} unique tags`)

  // 3. Create tag records
  const tagMap = new Map<string, number>()  // normalized name -> tag ID

  for (const [normalized, displayName] of uniqueTags) {
    try {
      const slug = await generateUniqueSlug(displayName)

      const tag = await prisma.tag.create({
        data: {
          name: normalized,
          displayName,
          slug
        }
      })

      tagMap.set(normalized, tag.id)
      console.log(`Created tag: ${displayName} (${slug})`)
    } catch (error) {
      console.error(`Failed to create tag "${displayName}":`, error.message)
    }
  }

  console.log(`Created ${tagMap.size} tags`)

  // 4. Create post-tag relationships
  let relationshipsCreated = 0

  for (const post of posts) {
    const tags = post.tags as string[]
    if (!Array.isArray(tags)) continue

    const seenTags = new Set<number>()

    for (const tag of tags) {
      if (typeof tag !== 'string') continue

      const trimmed = tag.trim()
      if (!trimmed) continue

      const normalized = trimmed.toLowerCase()
      const tagId = tagMap.get(normalized)

      if (!tagId) {
        console.warn(`Tag not found for post ${post.id}: "${trimmed}"`)
        continue
      }

      // Avoid duplicates
      if (seenTags.has(tagId)) continue
      seenTags.add(tagId)

      try {
        await prisma.postTag.create({
          data: {
            postId: post.id,
            tagId
          }
        })
        relationshipsCreated++
      } catch (error) {
        console.error(`Failed to create post-tag relationship (post: ${post.id}, tag: ${tagId}):`, error.message)
      }
    }
  }

  console.log(`Created ${relationshipsCreated} post-tag relationships`)

  // 5. Verify data integrity
  const tagCount = await prisma.tag.count()
  const postTagCount = await prisma.postTag.count()
  const postsWithTags = await prisma.post.count({
    where: {
      tags: {
        some: {}
      }
    }
  })

  console.log('\nMigration complete!')
  console.log(`Tags: ${tagCount}`)
  console.log(`Post-tag relationships: ${postTagCount}`)
  console.log(`Posts with tags: ${postsWithTags}`)

  return {
    tagsCreated: tagMap.size,
    relationshipsCreated,
    postsWithTags
  }
}

function generateUniqueSlug(name: string): string {
  // Same as API implementation
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

migrateTags()
  .then(result => {
    console.log('Success:', result)
    process.exit(0)
  })
  .catch(error => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
```

### Post-Migration Steps

1. **Verify data**
   - Check tag counts match
   - Spot-check posts have correct tags
   - Test tag filtering works

2. **Update code**
   - Deploy new API endpoints
   - Update admin forms to use TagInput component
   - Update public pages to display tags

3. **Keep JSON field temporarily** (7 days)
   - Don't drop `posts.tags` column immediately
   - Allows rollback if issues found
   - After 7 days of stable operation, remove column

4. **Monitor performance**
   - Check query times
   - Verify Redis caching works
   - Monitor database load

---

## Implementation Timeline

### Total Duration: 10-12 Weeks

#### Phase 0: Planning & Preparation (Week 1)

**Tasks:**
- Review and approve PRD
- Design database schema finalization
- Create migration script
- Set up staging environment
- Write audit script

**Deliverables:**
- Finalized PRD
- Database migration script (tested on staging)
- Pre-migration audit report

---

#### Phase 1: Database & Migration (Weeks 2-3)

**Week 2:**
- Create Prisma schema updates
- Write migration script
- Test migration on staging with production data copy
- Fix any data issues discovered
- Performance testing of queries

**Week 3:**
- Run production migration
- Verify data integrity
- Keep JSON field for rollback capability
- Monitor database performance
- Create database indexes

**Deliverables:**
- Migrated database with relational tags
- All posts have correct tag relationships
- Performance benchmarks documented

---

#### Phase 2: API Development (Weeks 4-5)

**Week 4:**
- Implement core tag CRUD endpoints
- Implement tag suggestions endpoint
- Add validation and sanitization
- Redis caching layer
- Error handling

**Week 5:**
- Implement tag merge endpoint
- Implement bulk operations endpoint
- Update posts endpoints for tag filtering
- Implement related posts endpoint
- Unit tests (80%+ coverage)

**Deliverables:**
- All API endpoints implemented
- Comprehensive test coverage
- API documentation
- Postman/Insomnia collection

---

#### Phase 3: Frontend Components (Weeks 6-7)

**Week 6:**
- Build TagInput component
- Build TagPill component
- Build RelatedPosts component
- Accessibility testing
- Component storybook/documentation

**Week 7:**
- Build admin tag manager interface
- Tag list with search/filter
- Tag edit modal
- Tag merge interface
- Bulk operations UI

**Deliverables:**
- All reusable components built
- Admin tag management interface
- Accessibility compliance (WCAG 2.1 AA)
- Component documentation

---

#### Phase 4: Integration (Weeks 8-9)

**Week 8:**
- Replace tag input in post create/edit forms
- Add tag filtering to admin posts list
- Add tag filtering to public blog
- Update post display pages with new tags
- Cache warming strategies

**Week 9:**
- Add related posts to post detail pages
- Performance optimization
- Cross-browser testing
- Mobile testing
- Bug fixes

**Deliverables:**
- Fully integrated tag system
- All admin pages updated
- All public pages updated
- Performance optimized

---

#### Phase 5: Testing & QA (Week 10)

**Tasks:**
- End-to-end testing
- Load testing (simulate high traffic)
- Security audit
- Accessibility audit
- User acceptance testing
- Bug fixing
- Documentation updates

**Deliverables:**
- QA report
- Security audit passed
- All critical bugs fixed
- User documentation

---

#### Phase 6: Deployment & Monitoring (Weeks 11-12)

**Week 11:**
- Deploy to production
- Monitor errors and performance
- Quick bug fixes
- User feedback collection

**Week 12:**
- Performance tuning based on real usage
- Documentation polish
- Remove JSON tags field (after 7 days stable)
- Final testing
- Project retrospective

**Deliverables:**
- Production deployment
- Monitoring dashboards
- Final documentation
- Project closeout report

---

## Success Criteria

### Must Have (Required for Launch)

- ✅ All existing tags migrated successfully with zero data loss
- ✅ Tag input works with keyboard-only navigation
- ✅ Posts can be filtered by single or multiple tags (OR logic)
- ✅ Related posts show based on shared tags (3 posts)
- ✅ Tag merge functionality works correctly
- ✅ Bulk tag operations work (add/remove tags from multiple posts)
- ✅ Performance < 100ms for tag operations (with caching)
- ✅ All validation rules enforced (50 char max, allowed characters, reserved words)
- ✅ No XSS vulnerabilities (sanitization working)
- ✅ Admin-only endpoints properly secured

### Should Have (Important but not blockers)

- ✅ Tag manager interface with search/filter
- ✅ Usage counts displayed in admin interface
- ✅ Debounced typeahead (200ms) for better UX
- ✅ Loading states for all async operations
- ✅ Redis caching (5 min TTL) for performance
- ✅ Full-text search support for tag names

### Could Have (Nice to have, future versions)

- Tag auto-suggestions based on post content
- Tag trending and popularity metrics
- Advanced tag analytics and reporting
- Tag hierarchies (parent/child relationships)
- Tag aliases/synonyms
- Import/export functionality
- Audit logging

---

## Performance Targets

### Response Times

- Tag list (cached): < 10ms
- Tag list (uncached): < 50ms
- Tag suggestions: < 50ms
- Post filtering by tags: < 100ms
- Related posts: < 100ms
- Tag merge: < 500ms (complex operation)

### Database Queries

- Tag list: 1-2 queries (with COUNT)
- Post with tags: 1 query (with include)
- Related posts: 1 query (optimized SQL)
- Tag suggestions: 1 query (with full-text search)

### Caching Strategy

```typescript
const CACHE_TTL = {
  tagList: 300,       // 5 minutes
  tagSuggestions: 120, // 2 minutes
  relatedPosts: 300,   // 5 minutes
  singleTag: 600       // 10 minutes
}
```

**Cache Invalidation:**
- Tag created/updated/deleted → invalidate `tags:list:*`
- Tag merged → invalidate all caches (`flushdb`)
- Bulk operations → invalidate `related:*`

---

## Security Considerations

### Input Validation

All user inputs must pass through:
1. Zod schema validation
2. DOMPurify sanitization
3. Custom business logic validation
4. Database constraints

### XSS Prevention

```typescript
// Server-side sanitization (required)
import DOMPurify from 'isomorphic-dompurify'

function sanitizeTagName(name: string): string {
  return DOMPurify.sanitize(name.trim(), { ALLOWED_TAGS: [] })
}

function sanitizeDescription(desc: string): string {
  return DOMPurify.sanitize(desc.trim(), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: []
  })
}
```

### SQL Injection Prevention

- Use Prisma ORM (parameterized queries)
- Never use raw SQL with user input
- If raw SQL needed, use `$queryRaw` with typed parameters

### Authentication

- All mutation endpoints check `checkAdminAuth()`
- No mutations allowed without admin session
- Read endpoints are public (portfolio context)

### Rate Limiting

Not implemented (single-user application). If adding multi-user support later, implement rate limiting per user.

---

## Testing Strategy

### Unit Tests

- All validation functions
- Slug generation logic
- All API endpoints (mock Prisma)
- Component logic

**Target:** 80%+ code coverage

### Integration Tests

- Full API request/response cycles
- Database operations
- Cache operations
- Migration script

### End-to-End Tests

- Tag creation flow (admin)
- Tag editing flow (admin)
- Tag merging (admin)
- Bulk operations (admin)
- Post filtering (public)
- Related posts (public)

### Performance Tests

- Load testing (100 concurrent requests)
- Query performance (explain analyze)
- Cache hit rates

### Security Tests

- XSS attempts in tag names
- SQL injection attempts
- Unauthorized access attempts
- Input validation bypass attempts

---

## Rollback Plan

### If Migration Fails

1. Restore database from backup
2. Fix migration script
3. Test on staging again
4. Retry migration

### If Issues Found Post-Migration

**Within 7 days (while JSON field exists):**
1. Keep new tables intact
2. Code can read from JSON field temporarily
3. Fix issues in relational data
4. Switch back to relational once fixed

**After 7 days:**
1. Cannot rollback easily (JSON field removed)
2. Fix forward by correcting data in relational tables
3. Use database backups if catastrophic

---

## Monitoring & Alerts

### Key Metrics

- API response times (p50, p95, p99)
- Error rates by endpoint
- Cache hit rates
- Database query counts
- Database slow query log

### Alerts

- API errors > 5% → immediate alert
- Response time p95 > 200ms → warning
- Cache hit rate < 70% → warning
- Database connection pool exhausted → immediate alert

### Dashboards

- Real-time API performance
- Tag usage statistics
- Cache performance
- Database query performance

---

## Documentation Requirements

### Technical Documentation

- API documentation (OpenAPI spec)
- Database schema documentation
- Component API documentation
- Deployment guide
- Migration guide

### User Documentation

- Admin tag management guide
- How to use tag input
- How to filter posts by tags
- How to merge duplicate tags
- Bulk operations guide

---

## Risks & Mitigation

### High Risks

**Risk:** Migration corrupts data or loses tags
- **Mitigation:** Pre-migration audit, staging test, database backup, 7-day rollback window

**Risk:** Performance issues with large tag counts
- **Mitigation:** Proper indexes, Redis caching, query optimization, load testing

**Risk:** XSS vulnerabilities in tag display
- **Mitigation:** Strict sanitization (DOMPurify), CSP headers, security audit

### Medium Risks

**Risk:** Tag merge accidentally combines wrong tags
- **Mitigation:** Confirmation modal, show affected posts count, test thoroughly

**Risk:** Bulk operations affect wrong posts
- **Mitigation:** Preview before executing, confirmation dialog, limit batch size

**Risk:** Cache invalidation bugs cause stale data
- **Mitigation:** Conservative cache TTLs, explicit invalidation on mutations, monitoring

### Low Risks

**Risk:** Reserved words block legitimate tags
- **Mitigation:** Limited list (only truly problematic words), can expand if needed

**Risk:** 50 character limit too restrictive
- **Mitigation:** Can increase if needed (database supports 100), but encourage concise tags

---

## Future Enhancements (Post-V1)

### Version 2.0 (Potential Features)

1. **Tag Hierarchies**
   - Parent/child relationships
   - Nested tag displays
   - Breadcrumb navigation

2. **Tag Aliases**
   - "JS" → "JavaScript" mapping
   - Auto-redirect to canonical tag

3. **Auto-tagging**
   - ML-based tag suggestions from content
   - Improve over time with training

4. **Tag Analytics**
   - Usage trends over time
   - Tag performance metrics
   - Content gap analysis

5. **Tag Templates**
   - Predefined tag sets for content types
   - Quick apply common tag combinations

6. **Import/Export**
   - CSV import for bulk tag creation
   - JSON export for backup/migration

7. **Audit Logging**
   - Track all tag changes
   - Who changed what when
   - Useful if expanding to multi-user

8. **Undo Functionality**
   - 5-minute undo window for destructive operations
   - Stored in sessionStorage

---

## Conclusion

This enhanced tag system represents a significant upgrade from the current JSON-based approach. By following this comprehensive PRD, we will deliver:

- **Robust data model** with proper validation and security
- **Intuitive admin interface** for tag management
- **Enhanced user experience** with typeahead and related posts
- **High performance** through caching and query optimization
- **Maintainable codebase** with comprehensive testing

The 10-12 week timeline allows for thorough implementation, testing, and polish, resulting in a production-ready system that will scale as the site grows.

---

## Appendix

### Related Documents

- Database schema: See "Database Schema" section
- API specification: See "API Specification" section
- Migration script: See "Migration Strategy" section
- Component specs: See "Frontend Components" section

### Glossary

- **Tag**: A label applied to content for categorization
- **Slug**: URL-friendly version of tag name (e.g., "react-native")
- **Typeahead**: Auto-complete suggestions while typing
- **Merge**: Combine multiple tags into one
- **Bulk operation**: Apply change to multiple items at once
- **Hard delete**: Permanent removal from database
- **Soft delete**: Mark as deleted but keep in database

### Change Log

- 2025-02-07: Initial v2 PRD created (combines original vision with critique fixes)
