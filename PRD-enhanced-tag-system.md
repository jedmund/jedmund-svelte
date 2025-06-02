# Product Requirements Document: Enhanced Tag System

## Overview

Upgrade the current JSON-based tag system to a relational database model with advanced tagging features including tag filtering, related posts, tag management, and an improved tag input UI with typeahead functionality.

## Goals

- Enable efficient querying and filtering of posts by tags
- Provide tag management capabilities for content curation
- Show related posts based on shared tags
- Implement intuitive tag input with typeahead and keyboard shortcuts
- Build analytics and insights around tag usage
- Maintain backward compatibility during migration

## Technical Constraints

- **Framework**: SvelteKit with Svelte 5 runes mode
- **Database**: PostgreSQL with Prisma ORM
- **Hosting**: Railway (existing infrastructure)
- **Design System**: Use existing admin component library
- **Performance**: Tag operations should be sub-100ms

## Current State vs Target State

### Current Implementation
- Tags stored as JSON arrays: `tags: ['announcement', 'meta', 'cms']`
- Simple display-only functionality
- No querying capabilities
- Manual tag input with Add button

### Target Implementation
- Relational many-to-many tag system
- Full CRUD operations for tags
- Advanced filtering and search
- Typeahead tag input with keyboard navigation
- Tag analytics and management interface

## Database Schema Changes

### New Tables

```sql
-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color for tag styling
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post-Tag junction table
CREATE TABLE post_tags (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, tag_id)
);

-- Tag usage analytics (optional)
CREATE TABLE tag_analytics (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Prisma Schema Updates

```prisma
model Tag {
  id          Int       @id @default(autoincrement())
  name        String    @unique @db.VarChar(100)
  slug        String    @unique @db.VarChar(100)
  description String?   @db.Text
  color       String?   @db.VarChar(7)  // Hex color
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relations
  posts       PostTag[]
  
  @@index([name])
  @@index([slug])
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
}

// Update existing Post model
model Post {
  // ... existing fields
  tags      PostTag[]  // Replace: tags Json?
}
```

## Core Features

### 1. Tag Management Interface

#### Admin Tag Manager (`/admin/tags`)
- **Tag List View**
  - DataTable with tag name, usage count, created date
  - Search and filter capabilities
  - Bulk operations (delete, merge, rename)
  - Color coding and visual indicators

- **Tag Detail/Edit View**
  - Edit tag name, description, color
  - View all posts using this tag
  - Usage analytics and trends
  - Merge with other tags functionality

#### Tag Analytics Dashboard
- **Usage Statistics**
  - Most/least used tags
  - Tag usage trends over time
  - Orphaned tags (no posts)
  - Tag co-occurrence patterns

- **Tag Insights**
  - Suggested tag consolidations
  - Similar tags detection
  - Tag performance metrics

### 2. Enhanced Tag Input Component (`TagInput.svelte`)

#### Features
- **Typeahead Search**: Real-time search of existing tags
- **Keyboard Navigation**: Arrow keys to navigate suggestions
- **Instant Add**: Press Enter to add tag without button click
- **Visual Feedback**: Highlight matching text in suggestions
- **Tag Validation**: Prevent duplicates and invalid characters
- **Quick Actions**: Backspace to remove last tag

#### Component API
```typescript
interface TagInputProps {
  tags: string[] | Tag[]           // Current tags
  suggestions?: Tag[]              // Available tags for typeahead
  placeholder?: string             // Input placeholder text
  maxTags?: number                // Maximum number of tags
  allowNew?: boolean              // Allow creating new tags
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  onTagAdd?: (tag: Tag) => void
  onTagRemove?: (tag: Tag) => void
  onTagCreate?: (name: string) => void
}
```

#### Svelte 5 Implementation
```svelte
<script lang="ts">
  let {
    tags = $bindable([]),
    suggestions = [],
    placeholder = "Add tags...",
    maxTags = 10,
    allowNew = true,
    size = 'medium',
    disabled = false,
    onTagAdd,
    onTagRemove,
    onTagCreate
  }: TagInputProps = $props()

  let inputValue = $state('')
  let showSuggestions = $state(false)
  let selectedIndex = $state(-1)
  let inputElement: HTMLInputElement

  // Filtered suggestions based on input
  let filteredSuggestions = $derived(
    suggestions.filter(tag => 
      tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.some(t => t.id === tag.id)
    )
  )

  // Handle keyboard navigation
  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          addExistingTag(filteredSuggestions[selectedIndex])
        } else if (inputValue.trim() && allowNew) {
          createNewTag(inputValue.trim())
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        selectedIndex = Math.min(selectedIndex + 1, filteredSuggestions.length - 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        selectedIndex = Math.max(selectedIndex - 1, -1)
        break
      case 'Backspace':
        if (!inputValue && tags.length > 0) {
          removeTag(tags[tags.length - 1])
        }
        break
      case 'Escape':
        showSuggestions = false
        selectedIndex = -1
        break
    }
  }
</script>
```

### 3. Post Filtering by Tags

#### Frontend Components
- **Tag Filter Bar**: Multi-select tag filtering
- **Tag Cloud**: Visual tag representation with usage counts
- **Search Integration**: Combine text search with tag filters

#### API Endpoints
```typescript
// GET /api/posts?tags=javascript,react&operation=AND
// GET /api/posts?tags=design,ux&operation=OR
interface PostsQueryParams {
  tags?: string[]               // Tag names or IDs
  operation?: 'AND' | 'OR'     // How to combine multiple tags
  page?: number
  limit?: number
  status?: 'published' | 'draft'
}

// GET /api/tags/suggest?q=java
interface TagSuggestResponse {
  tags: Array<{
    id: number
    name: string
    slug: string
    usageCount: number
  }>
}
```

### 4. Related Posts Feature

#### Implementation
- **Algorithm**: Find posts sharing the most tags
- **Weighting**: Consider tag importance and recency
- **Exclusions**: Don't show current post in related list
- **Limit**: Show 3-6 related posts maximum

#### Component (`RelatedPosts.svelte`)
```svelte
<script lang="ts">
  let { postId, tags, limit = 4 }: {
    postId: number
    tags: Tag[]
    limit?: number
  } = $props()

  let relatedPosts = $state<Post[]>([])

  $effect(async () => {
    const tagIds = tags.map(t => t.id)
    const response = await fetch(`/api/posts/related?postId=${postId}&tagIds=${tagIds.join(',')}&limit=${limit}`)
    relatedPosts = await response.json()
  })
</script>
```

## API Specification

### Tag Management APIs

```typescript
// GET /api/tags - List all tags
interface TagsResponse {
  tags: Tag[]
  total: number
  page: number
  limit: number
}

// POST /api/tags - Create new tag
interface CreateTagRequest {
  name: string
  description?: string
  color?: string
}

// PUT /api/tags/[id] - Update tag
interface UpdateTagRequest {
  name?: string
  description?: string
  color?: string
}

// DELETE /api/tags/[id] - Delete tag
// Returns: 204 No Content

// POST /api/tags/merge - Merge tags
interface MergeTagsRequest {
  sourceTagIds: number[]
  targetTagId: number
}

// GET /api/tags/[id]/posts - Get posts for tag
interface TagPostsResponse {
  posts: Post[]
  tag: Tag
  total: number
}

// GET /api/tags/analytics - Tag usage analytics
interface TagAnalyticsResponse {
  mostUsed: Array<{ tag: Tag; count: number }>
  leastUsed: Array<{ tag: Tag; count: number }>
  trending: Array<{ tag: Tag; growth: number }>
  orphaned: Tag[]
}
```

### Enhanced Post APIs

```typescript
// GET /api/posts/related?postId=123&tagIds=1,2,3&limit=4
interface RelatedPostsResponse {
  posts: Array<{
    id: number
    title: string
    slug: string
    excerpt?: string
    publishedAt: string
    tags: Tag[]
    sharedTagsCount: number  // Number of tags in common
  }>
}

// PUT /api/posts/[id]/tags - Update post tags
interface UpdatePostTagsRequest {
  tagIds: number[]
}
```

## User Interface Components

### 1. TagInput Component Features

#### Visual States
- **Default**: Clean input with placeholder
- **Focused**: Show suggestions dropdown
- **Typing**: Filter and highlight matches
- **Selected**: Navigate with keyboard
- **Adding**: Smooth animation for new tags
- **Full**: Disable input when max tags reached

#### Accessibility
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Logical tab order
- **Announcements**: Screen reader feedback for actions

### 2. Tag Display Components

#### TagPill Component
```svelte
<script lang="ts">
  let {
    tag,
    size = 'medium',
    removable = false,
    clickable = false,
    showCount = false,
    onRemove,
    onClick
  }: TagPillProps = $props()
</script>

<span 
  class="tag-pill tag-pill-{size}"
  style="--tag-color: {tag.color}"
  class:clickable
  class:removable
  onclick={onClick}
>
  {tag.name}
  {#if showCount}
    <span class="tag-count">({tag.usageCount})</span>
  {/if}
  {#if removable}
    <button onclick={onRemove} class="tag-remove">×</button>
  {/if}
</span>
```

#### TagCloud Component
```svelte
<script lang="ts">
  let {
    tags,
    maxTags = 50,
    minFontSize = 12,
    maxFontSize = 24,
    onClick
  }: TagCloudProps = $props()

  // Calculate font sizes based on usage
  let tagSizes = $derived(calculateTagSizes(tags, minFontSize, maxFontSize))
</script>
```

### 3. Admin Interface Updates

#### Posts List with Tag Filtering
- **Filter Bar**: Multi-select tag filter above posts list
- **Tag Pills**: Show tags on each post item
- **Quick Filter**: Click tag to filter by that tag
- **Clear Filters**: Easy way to reset all filters

#### Posts Edit Form Integration
- **Replace Current**: Swap existing tag input with new TagInput
- **Preserve UX**: Maintain current metadata popover
- **Tag Management**: Quick access to create/edit tags

## Migration Strategy

### Phase 1: Database Migration (Week 1)
1. **Create Migration Script**
   - Create new tables (tags, post_tags)
   - Migrate existing JSON tags to relational format
   - Create indexes for performance

2. **Data Migration**
   - Extract unique tags from existing posts
   - Create tag records with auto-generated slugs
   - Create post_tag relationships
   - Validate data integrity

3. **Backward Compatibility**
   - Keep original tags JSON field temporarily
   - Dual-write to both systems during transition

### Phase 2: API Development (Week 1-2)
1. **Tag Management APIs**
   - CRUD operations for tags
   - Tag suggestions and search
   - Analytics endpoints

2. **Enhanced Post APIs**
   - Update post endpoints for relational tags
   - Related posts algorithm
   - Tag filtering capabilities

3. **Testing & Validation**
   - Unit tests for all endpoints
   - Performance testing for queries
   - Data consistency checks

### Phase 3: Frontend Components (Week 2-3)
1. **Core Components**
   - TagInput with typeahead
   - TagPill and TagCloud
   - Tag management interface

2. **Integration**
   - Update MetadataPopover
   - Add tag filtering to posts list
   - Implement related posts component

3. **Admin Interface**
   - Tag management dashboard
   - Analytics views
   - Bulk operations interface

### Phase 4: Features & Polish (Week 3-4)
1. **Advanced Features**
   - Tag merging functionality
   - Usage analytics
   - Tag suggestions based on content

2. **Performance Optimization**
   - Query optimization
   - Caching strategies
   - Load testing

3. **Cleanup**
   - Remove JSON tags field
   - Documentation updates
   - Final testing

## Success Metrics

### Performance
- Tag search responses under 50ms
- Post filtering responses under 100ms
- Page load times maintained or improved

### Usability
- Reduced clicks to add tags (eliminate Add button)
- Faster tag input with typeahead
- Improved content discovery through related posts

### Content Management
- Ability to merge duplicate tags
- Insights into tag usage patterns
- Better content organization capabilities

### Analytics
- Track tag usage growth over time
- Identify content gaps through tag analysis
- Measure impact on content engagement

## Technical Considerations

### Performance
- **Database Indexes**: Proper indexing on tag names and relationships
- **Query Optimization**: Efficient joins for tag filtering
- **Caching**: Cache popular tag lists and related posts
- **Pagination**: Handle large tag lists efficiently

### Data Integrity
- **Constraints**: Prevent duplicate tag names
- **Cascading Deletes**: Properly handle tag/post deletions
- **Validation**: Ensure tag names follow naming conventions
- **Backup Strategy**: Safe migration with rollback capability

### User Experience
- **Progressive Enhancement**: Graceful degradation if JS fails
- **Loading States**: Smooth loading indicators
- **Error Handling**: Clear error messages for users
- **Responsive Design**: Works well on all device sizes

## Future Enhancements

### Advanced Features (Post-MVP)
- **Hierarchical Tags**: Parent/child tag relationships
- **Tag Synonyms**: Alternative names for the same concept
- **Auto-tagging**: ML-based tag suggestions from content
- **Tag Templates**: Predefined tag sets for different content types

### Integrations
- **External APIs**: Import tags from external sources
- **Search Integration**: Enhanced search with tag faceting
- **Analytics**: Deep tag performance analytics
- **Content Recommendations**: AI-powered related content

## Risk Assessment

### High Risk
- **Data Migration**: Complex migration of existing tag data
- **Performance Impact**: New queries might affect page load times
- **User Adoption**: Users need to learn new tag input interface

### Mitigation Strategies
- **Staged Rollout**: Deploy to staging first, then gradual production rollout
- **Performance Monitoring**: Continuous monitoring during migration
- **User Training**: Clear documentation and smooth UX transitions
- **Rollback Plan**: Ability to revert to JSON tags if needed

## Success Criteria

### Must Have
- ✅ All existing tags migrated successfully
- ✅ Tag input works with keyboard-only navigation
- ✅ Posts can be filtered by single or multiple tags
- ✅ Related posts show based on shared tags
- ✅ Performance remains acceptable (< 100ms for most operations)

### Should Have
- ✅ Tag management interface for admins
- ✅ Tag usage analytics and insights
- ✅ Ability to merge duplicate tags
- ✅ Tag color coding and visual improvements

### Could Have
- Tag auto-suggestions based on post content
- Tag trending and popularity metrics
- Advanced tag analytics and reporting
- Integration with external tag sources

## Timeline

**Total Duration**: 4 weeks

- **Week 1**: Database migration and API development
- **Week 2**: Core frontend components and basic integration
- **Week 3**: Advanced features and admin interface
- **Week 4**: Polish, testing, and production deployment

## Conclusion

This enhanced tag system will significantly improve content organization, discoverability, and management capabilities while providing a modern, intuitive user interface built with Svelte 5 runes. The migration strategy ensures minimal disruption while delivering substantial improvements in functionality and user experience.