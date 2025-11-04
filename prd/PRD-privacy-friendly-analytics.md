# Product Requirements Document: Privacy-Friendly Analytics

## Overview

Implement a self-hosted, privacy-first analytics system to track content engagement without using third-party services like Google Analytics. The system will provide insight into which posts, photos, albums, and projects resonate with visitors while respecting user privacy and complying with GDPR/privacy regulations.

## Goals

- Track page views for all content types (Posts, Photos, Albums, Projects)
- Provide actionable insights about content performance
- Maintain user privacy (no cookies, no PII, no tracking across sites)
- Leverage existing infrastructure (PostgreSQL + Redis)
- Build admin dashboard for viewing analytics
- Keep system lightweight and performant

## Privacy-First Principles

### What We Track
- Content views (which pages are accessed)
- Referrer sources (where traffic comes from)
- Approximate unique visitors (session-based deduplication)
- Timestamp of visits

### What We DON'T Track
- Personal Identifying Information (PII)
- User cookies or local storage
- IP addresses (only hashed for deduplication)
- User behavior across sessions
- Cross-site tracking
- Device fingerprinting beyond basic deduplication

### Privacy Guarantees
- **No cookies**: Zero client-side storage
- **IP hashing**: IPs hashed with daily salt, never stored
- **User-agent hashing**: Combined with IP for session deduplication
- **Short retention**: Raw data kept for 90 days, then aggregated
- **GDPR compliant**: No consent needed (legitimate interest)
- **No third parties**: All data stays on our servers

## Technical Architecture

### Database Schema

#### PageView Table (Detailed Tracking)

```prisma
model PageView {
  id            Int      @id @default(autoincrement())
  contentType   String   @db.VarChar(50)    // "post", "photo", "album", "project"
  contentId     Int                          // ID of the content
  contentSlug   String   @db.VarChar(255)   // Slug for reference

  // Privacy-preserving visitor identification
  sessionHash   String   @db.VarChar(64)    // SHA-256(IP + User-Agent + daily_salt)

  // Metadata
  referrer      String?  @db.VarChar(500)   // Where visitor came from
  timestamp     DateTime @default(now())

  @@index([contentType, contentId])
  @@index([timestamp])
  @@index([sessionHash, timestamp])
  @@index([contentType, timestamp])
}
```

#### AggregatedView Table (Long-term Storage)

```prisma
model AggregatedView {
  id            Int      @id @default(autoincrement())
  contentType   String   @db.VarChar(50)
  contentId     Int
  contentSlug   String   @db.VarChar(255)

  // Aggregated metrics
  date          DateTime @db.Date           // Day of aggregation
  viewCount     Int      @default(0)        // Total views that day
  uniqueCount   Int      @default(0)        // Approximate unique visitors

  @@unique([contentType, contentId, date])
  @@index([contentType, contentId])
  @@index([date])
}
```

### API Endpoints

#### Tracking Endpoint (Public)

**`POST /api/analytics/track`**
- **Purpose**: Record a page view
- **Request Body**:
  ```typescript
  {
    contentType: 'post' | 'photo' | 'album' | 'project',
    contentId: number,
    contentSlug: string
  }
  ```
- **Server-side Processing**:
  - Extract IP address from request
  - Extract User-Agent from headers
  - Extract Referrer from headers
  - Generate daily-rotated salt
  - Create sessionHash: `SHA-256(IP + UserAgent + salt)`
  - Insert PageView record (never store raw IP)
- **Response**: `{ success: true }`
- **Rate limiting**: Max 10 requests per minute per session

#### Admin Analytics Endpoints

**`GET /api/admin/analytics/overview`**
- **Purpose**: Dashboard overview statistics
- **Query Parameters**:
  - `period`: '7d' | '30d' | '90d' | 'all'
- **Response**:
  ```typescript
  {
    totalViews: number,
    uniqueVisitors: number,
    topContent: [
      { type, id, slug, title, views, uniqueViews }
    ],
    viewsByDay: [
      { date, views, uniqueVisitors }
    ]
  }
  ```

**`GET /api/admin/analytics/content`**
- **Purpose**: Detailed analytics for specific content
- **Query Parameters**:
  - `type`: 'post' | 'photo' | 'album' | 'project'
  - `id`: content ID
  - `period`: '7d' | '30d' | '90d' | 'all'
- **Response**:
  ```typescript
  {
    contentInfo: { type, id, slug, title },
    totalViews: number,
    uniqueVisitors: number,
    viewsByDay: [{ date, views, uniqueVisitors }],
    topReferrers: [{ referrer, count }]
  }
  ```

**`GET /api/admin/analytics/trending`**
- **Purpose**: Find trending content
- **Query Parameters**:
  - `type`: 'post' | 'photo' | 'album' | 'project' | 'all'
  - `days`: number (default 7)
  - `limit`: number (default 10)
- **Response**:
  ```typescript
  [
    {
      type, id, slug, title,
      recentViews: number,
      previousViews: number,
      growthPercent: number
    }
  ]
  ```

**`GET /api/admin/analytics/referrers`**
- **Purpose**: Traffic source analysis
- **Query Parameters**:
  - `period`: '7d' | '30d' | '90d' | 'all'
- **Response**:
  ```typescript
  [
    {
      referrer: string,
      views: number,
      uniqueVisitors: number,
      topContent: [{ type, id, slug, title, views }]
    }
  ]
  ```

### Redis Caching Strategy

**Cache Keys**:
- `analytics:overview:{period}` - Dashboard overview (TTL: 10 minutes)
- `analytics:content:{type}:{id}:{period}` - Content details (TTL: 10 minutes)
- `analytics:trending:{type}:{days}` - Trending content (TTL: 5 minutes)
- `analytics:referrers:{period}` - Referrer stats (TTL: 15 minutes)
- `analytics:salt:{date}` - Daily salt for hashing (TTL: 24 hours)

**Cache Invalidation**:
- Automatic TTL expiration (stale data acceptable for analytics)
- Manual flush on data aggregation (daily job)
- Progressive cache warming during admin page load

### Frontend Integration

#### Client-side Tracking Hook

```typescript
// src/lib/utils/analytics.ts
export async function trackPageView(
  contentType: 'post' | 'photo' | 'album' | 'project',
  contentId: number,
  contentSlug: string
): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType, contentId, contentSlug }),
      // Fire and forget - don't block page render
      keepalive: true
    });
  } catch (error) {
    // Silently fail - analytics shouldn't break the page
    console.debug('Analytics tracking failed:', error);
  }
}
```

#### Page Integration Examples

**Universe Post Page** (`/universe/[slug]/+page.svelte`):
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { trackPageView } from '$lib/utils/analytics';

  const { data } = $props();

  onMount(() => {
    trackPageView('post', data.post.id, data.post.slug);
  });
</script>
```

**Photo Page** (`/photos/[id]/+page.svelte`):
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { trackPageView } from '$lib/utils/analytics';

  const { data } = $props();

  onMount(() => {
    trackPageView('photo', data.photo.id, data.photo.slug || String(data.photo.id));
  });
</script>
```

**Album Page** (`/albums/[slug]/+page.svelte`):
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { trackPageView } from '$lib/utils/analytics';

  const { data } = $props();

  onMount(() => {
    trackPageView('album', data.album.id, data.album.slug);
  });
</script>
```

**Project Page** (`/work/[slug]/+page.svelte`):
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { trackPageView } from '$lib/utils/analytics';

  const { data } = $props();

  onMount(() => {
    trackPageView('project', data.project.id, data.project.slug);
  });
</script>
```

### Admin Dashboard UI

#### Main Analytics Page (`/admin/analytics/+page.svelte`)

**Layout**:
```
┌─────────────────────────────────────────────────┐
│  Analytics Overview                              │
│  [7 Days] [30 Days] [90 Days] [All Time]        │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  5,432   │  │  2,891   │  │  3.2      │      │
│  │  Views   │  │  Visitors│  │  Avg/Day │      │
│  └──────────┘  └──────────┘  └──────────┘      │
├─────────────────────────────────────────────────┤
│  Views Over Time                                 │
│  [Line Chart: Views per day]                    │
├─────────────────────────────────────────────────┤
│  Top Content                                     │
│  1. Photo: Sunset in Tokyo        234 views     │
│  2. Post: New Design System       189 views     │
│  3. Project: Mobile Redesign      156 views     │
│  4. Album: Japan 2024             142 views     │
│  ...                                             │
├─────────────────────────────────────────────────┤
│  Top Referrers                                   │
│  1. Direct / Bookmark             45%           │
│  2. twitter.com                   23%           │
│  3. linkedin.com                  15%           │
│  ...                                             │
└─────────────────────────────────────────────────┘
```

**Components**:
- Period selector (tabs or dropdown)
- Stat cards (total views, unique visitors, avg views/day)
- Time series chart (using simple SVG or chart library)
- Top content table (clickable to view detailed analytics)
- Top referrers table
- Loading states and error handling

#### Content Detail Page (`/admin/analytics/[type]/[id]/+page.svelte`)

**Layout**:
```
┌─────────────────────────────────────────────────┐
│  ← Back to Overview                              │
│  Analytics: "Sunset in Tokyo" (Photo)            │
│  [7 Days] [30 Days] [90 Days] [All Time]        │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐                     │
│  │  234     │  │  187     │                     │
│  │  Views   │  │  Unique  │                     │
│  └──────────┘  └──────────┘                     │
├─────────────────────────────────────────────────┤
│  Views Over Time                                 │
│  [Line Chart: Daily views]                      │
├─────────────────────────────────────────────────┤
│  Traffic Sources                                 │
│  1. Direct                        89 views       │
│  2. twitter.com/user/post         45 views       │
│  3. reddit.com/r/photography      23 views       │
│  ...                                             │
└─────────────────────────────────────────────────┘
```

**Features**:
- Content preview/link
- Period selector
- View count and unique visitor count
- Daily breakdown chart
- Detailed referrer list with clickable links
- Export data option (CSV)

#### Integration with Existing Admin

Add analytics link to admin navigation:
- Navigation item: "Analytics"
- Badge showing today's view count
- Quick stats in admin dashboard overview

### Data Retention & Cleanup

#### Daily Aggregation Job

**Cron job** (runs at 2 AM daily):
```typescript
// scripts/aggregate-analytics.ts
async function aggregateOldData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  // 1. Group PageViews older than 90 days by (contentType, contentId, date)
  const oldViews = await prisma.pageView.groupBy({
    by: ['contentType', 'contentId', 'contentSlug'],
    where: { timestamp: { lt: cutoffDate } },
    _count: { id: true },
    _count: { sessionHash: true } // Approximate unique
  });

  // 2. Insert/update AggregatedView records
  for (const view of oldViews) {
    await prisma.aggregatedView.upsert({
      where: {
        contentType_contentId_date: {
          contentType: view.contentType,
          contentId: view.contentId,
          date: extractDate(view.timestamp)
        }
      },
      update: {
        viewCount: { increment: view._count.id },
        uniqueCount: { increment: view._count.sessionHash }
      },
      create: {
        contentType: view.contentType,
        contentId: view.contentId,
        contentSlug: view.contentSlug,
        date: extractDate(view.timestamp),
        viewCount: view._count.id,
        uniqueCount: view._count.sessionHash
      }
    });
  }

  // 3. Delete old raw PageView records
  await prisma.pageView.deleteMany({
    where: { timestamp: { lt: cutoffDate } }
  });

  console.log(`Aggregated and cleaned up views older than ${cutoffDate}`);
}
```

**Run via**:
- Cron (if available): `0 2 * * * cd /app && npm run analytics:aggregate`
- Railway Cron Jobs (if supported)
- Manual trigger from admin panel
- Scheduled serverless function

#### Retention Policy

- **Detailed data**: 90 days (in PageView table)
- **Aggregated data**: Forever (in AggregatedView table)
- **Daily summaries**: Minimal storage footprint
- **Total storage estimate**: ~10MB per year for typical traffic

### Session Hash Implementation

```typescript
// src/lib/server/analytics-hash.ts
import crypto from 'crypto';
import redis from './redis-client';

export async function generateSessionHash(
  ip: string,
  userAgent: string
): Promise<string> {
  // Get or create daily salt
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const saltKey = `analytics:salt:${today}`;

  let salt = await redis.get(saltKey);
  if (!salt) {
    salt = crypto.randomBytes(32).toString('hex');
    await redis.set(saltKey, salt, 'EX', 86400); // 24 hour TTL
  }

  // Create session hash
  const data = `${ip}|${userAgent}|${salt}`;
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

// Helper to extract IP from request (handles proxies)
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to connection IP (may not be available in serverless)
  return 'unknown';
}
```

### Performance Considerations

#### Write Performance
- PageView inserts are async (fire-and-forget from client)
- No transaction overhead
- Batch inserts for high traffic (future optimization)
- Index optimization for common queries

#### Read Performance
- Redis caching for all admin queries
- Aggressive cache TTLs (5-15 minutes acceptable)
- Pre-aggregated data for historical queries
- Efficient indexes on timestamp and content fields

#### Database Growth
- ~100 bytes per PageView record
- 1,000 views/day = ~100KB/day = ~3.6MB/year (raw)
- Aggregation reduces to ~10KB/year after 90 days
- Negligible compared to media storage

## Implementation Phases

### Phase 1: Foundation & Database (Week 1)

**Tasks**:
- [x] Design PageView and AggregatedView schema
- [ ] Create Prisma migration for analytics tables
- [ ] Add indexes for common query patterns
- [ ] Test migrations on local database
- [ ] Create seed data for testing

**Deliverables**:
- Database schema ready
- Migrations tested and working

### Phase 2: Tracking Infrastructure (Week 1)

**Tasks**:
- [ ] Implement session hash generation utilities
- [ ] Create `POST /api/analytics/track` endpoint
- [ ] Add IP extraction and User-Agent handling
- [ ] Implement rate limiting
- [ ] Create analytics utility functions
- [ ] Add error handling and logging

**Deliverables**:
- Tracking endpoint functional
- Privacy-preserving hash working

### Phase 3: Frontend Integration (Week 2)

**Tasks**:
- [ ] Create `trackPageView()` utility function
- [ ] Add tracking to Universe post pages
- [ ] Add tracking to Photo pages
- [ ] Add tracking to Album pages
- [ ] Add tracking to Project pages
- [ ] Test tracking across all page types
- [ ] Verify data appearing in database

**Deliverables**:
- All content pages tracking views
- PageView data accumulating

### Phase 4: Analytics API Endpoints (Week 2)

**Tasks**:
- [ ] Implement `GET /api/admin/analytics/overview`
- [ ] Implement `GET /api/admin/analytics/content`
- [ ] Implement `GET /api/admin/analytics/trending`
- [ ] Implement `GET /api/admin/analytics/referrers`
- [ ] Add authentication middleware
- [ ] Write analytics query utilities
- [ ] Implement date range filtering

**Deliverables**:
- All admin API endpoints working
- Query performance optimized

### Phase 5: Redis Caching (Week 3)

**Tasks**:
- [ ] Implement cache key strategy
- [ ] Add caching to overview endpoint
- [ ] Add caching to content endpoint
- [ ] Add caching to trending endpoint
- [ ] Add caching to referrers endpoint
- [ ] Implement cache warming
- [ ] Test cache invalidation

**Deliverables**:
- Redis caching active
- Response times under 100ms

### Phase 6: Admin Dashboard UI (Week 3-4)

**Tasks**:
- [ ] Create `/admin/analytics` route
- [ ] Build overview page layout
- [ ] Implement period selector component
- [ ] Create stat cards component
- [ ] Build time series chart component
- [ ] Create top content table
- [ ] Create top referrers table
- [ ] Add loading and error states
- [ ] Style dashboard to match admin theme
- [ ] Test responsive design

**Deliverables**:
- Analytics dashboard fully functional
- UI matches admin design system

### Phase 7: Content Detail Pages (Week 4)

**Tasks**:
- [ ] Create `/admin/analytics/[type]/[id]` route
- [ ] Build content detail page layout
- [ ] Implement detailed metrics display
- [ ] Create referrer breakdown table
- [ ] Add navigation back to overview
- [ ] Add content preview/link
- [ ] Implement CSV export option

**Deliverables**:
- Content detail pages working
- Drill-down functionality complete

### Phase 8: Data Aggregation & Cleanup (Week 5)

**Tasks**:
- [ ] Write aggregation script
- [ ] Test aggregation with sample data
- [ ] Create manual trigger endpoint
- [ ] Set up scheduled job (cron or Railway)
- [ ] Add aggregation status logging
- [ ] Test data retention policy
- [ ] Document aggregation process

**Deliverables**:
- Aggregation job running daily
- Old data cleaned automatically

### Phase 9: Polish & Testing (Week 5)

**Tasks**:
- [ ] Add analytics link to admin navigation
- [ ] Create quick stats widget for admin dashboard
- [ ] Add today's view count badge
- [ ] Performance optimization pass
- [ ] Error handling improvements
- [ ] Write documentation
- [ ] Create user guide for analytics
- [ ] End-to-end testing

**Deliverables**:
- System fully integrated
- Documentation complete

### Phase 10: Monitoring & Launch (Week 6)

**Tasks**:
- [ ] Set up logging for analytics endpoints
- [ ] Monitor database query performance
- [ ] Check Redis cache hit rates
- [ ] Verify aggregation job running
- [ ] Test with production traffic
- [ ] Create runbook for troubleshooting
- [ ] Announce analytics feature

**Deliverables**:
- Production analytics live
- Monitoring in place

## Success Metrics

### Functional Requirements
- ✅ Track views for all content types (posts, photos, albums, projects)
- ✅ Provide unique visitor estimates (session-based)
- ✅ Show trending content over different time periods
- ✅ Display traffic sources (referrers)
- ✅ Admin dashboard accessible and intuitive

### Performance Requirements
- API response time < 100ms (cached queries)
- Tracking endpoint < 50ms response time
- No performance impact on public pages
- Database growth < 100MB/year
- Analytics page load < 2 seconds

### Privacy Requirements
- No cookies or client-side storage
- No IP addresses stored
- Session hashing non-reversible
- Data retention policy enforced
- GDPR compliant by design

### User Experience
- Admin can view analytics in < 3 clicks
- Dashboard updates within 5-10 minutes
- Clear visualization of trends
- Easy to identify popular content
- Referrer sources actionable

## Technical Decisions & Rationale

### Why Self-Hosted?
- **Privacy control**: Full ownership of analytics data
- **No third parties**: Data never leaves our servers
- **Cost**: Zero ongoing cost vs. paid analytics services
- **Customization**: Tailored to our exact content types

### Why PostgreSQL for Storage?
- **Already in stack**: Leverages existing database
- **Relational queries**: Perfect for analytics aggregations
- **JSON support**: Flexible for future extensions
- **Reliability**: Battle-tested for high-volume writes

### Why Redis for Caching?
- **Already in stack**: Existing Redis instance available
- **Speed**: Sub-millisecond cache lookups
- **TTL support**: Automatic expiration for stale data
- **Simple**: Key-value model perfect for cache

### Why Session Hashing?
- **Privacy**: Can't reverse to identify users
- **Deduplication**: Approximate unique visitors
- **Daily rotation**: Limits tracking window to 24 hours
- **No cookies**: Works without user consent

### Why 90-Day Retention?
- **Privacy**: Limit detailed tracking window
- **Performance**: Keeps PageView table size manageable
- **Historical data**: Aggregated summaries preserved forever
- **Balance**: Fresh data for trends, long-term for insights

## Future Enhancements

### Phase 2 Features (Post-Launch)
- [ ] Real-time analytics (WebSocket updates)
- [ ] Geographic data (country-level, privacy-preserving)
- [ ] View duration tracking (time on page)
- [ ] Custom events (video plays, downloads, etc.)
- [ ] A/B testing support
- [ ] Conversion tracking (email signups, etc.)

### Advanced Analytics
- [ ] Cohort analysis
- [ ] Funnel tracking
- [ ] Retention metrics
- [ ] Bounce rate calculation
- [ ] Exit page tracking

### Integrations
- [ ] Export to CSV/JSON
- [ ] Scheduled email reports
- [ ] Slack notifications for milestones
- [ ] Public analytics widget (opt-in)

### Admin Improvements
- [ ] Custom date range selection
- [ ] Saved analytics views
- [ ] Compare time periods
- [ ] Annotations on charts
- [ ] Predicted trends

## Testing Strategy

### Unit Tests
- Session hash generation
- Date range utilities
- Aggregation logic
- Cache key generation

### Integration Tests
- Tracking endpoint
- Analytics API endpoints
- Redis caching layer
- Database queries

### End-to-End Tests
- Track view from public page
- View analytics in admin
- Verify cache behavior
- Test aggregation job

### Load Testing
- Simulate 100 concurrent tracking requests
- Test admin dashboard under load
- Verify database performance
- Check Redis cache hit rates

## Documentation Requirements

### Developer Documentation
- API endpoint specifications
- Database schema documentation
- Caching strategy guide
- Aggregation job setup

### User Documentation
- Admin analytics guide
- Interpreting metrics
- Privacy policy updates
- Troubleshooting guide

### Operational Documentation
- Deployment checklist
- Monitoring setup
- Backup procedures
- Incident response

## Security Considerations

### Rate Limiting
- Tracking endpoint: 10 requests/minute per session
- Admin endpoints: 100 requests/minute per user
- Prevents abuse and DoS attacks

### Authentication
- All admin analytics endpoints require authentication
- Use existing admin auth system
- No public access to analytics data

### Data Privacy
- Never log raw IPs in application logs
- Session hashes rotated daily
- No cross-session tracking
- Complies with GDPR "legitimate interest" basis

### SQL Injection Prevention
- Use Prisma ORM (parameterized queries)
- Validate all input parameters
- Sanitize referrer URLs

## Open Questions

1. **Chart Library**: Use lightweight SVG solution or import charting library?
   - Option A: Simple SVG line charts (custom, lightweight)
   - Option B: Chart.js or similar (feature-rich, heavier)
   - **Decision**: Start with simple SVG, upgrade if needed

2. **Real-time Updates**: Should analytics dashboard update live?
   - Option A: Manual refresh only (simpler)
   - Option B: Auto-refresh every 30 seconds (nicer UX)
   - Option C: WebSocket real-time (complex)
   - **Decision**: Auto-refresh for Phase 1

3. **Export Functionality**: CSV export priority?
   - **Decision**: Include in Phase 2, not critical for MVP

4. **Geographic Data**: Track country-level data?
   - **Decision**: Future enhancement, requires IP geolocation

## Appendix

### Example Queries

**Total views for a piece of content**:
```sql
SELECT COUNT(*) FROM PageView
WHERE contentType = 'photo' AND contentId = 123;
```

**Unique visitors (approximate)**:
```sql
SELECT COUNT(DISTINCT sessionHash) FROM PageView
WHERE contentType = 'photo' AND contentId = 123
  AND timestamp > NOW() - INTERVAL '7 days';
```

**Top content in last 7 days**:
```sql
SELECT contentType, contentId, contentSlug,
       COUNT(*) as views,
       COUNT(DISTINCT sessionHash) as unique_visitors
FROM PageView
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY contentType, contentId, contentSlug
ORDER BY views DESC
LIMIT 10;
```

**Views by day**:
```sql
SELECT DATE(timestamp) as date,
       COUNT(*) as views,
       COUNT(DISTINCT sessionHash) as unique_visitors
FROM PageView
WHERE contentType = 'photo' AND contentId = 123
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Database Migration Template

```prisma
-- CreateTable
CREATE TABLE "PageView" (
  "id" SERIAL PRIMARY KEY,
  "contentType" VARCHAR(50) NOT NULL,
  "contentId" INTEGER NOT NULL,
  "contentSlug" VARCHAR(255) NOT NULL,
  "sessionHash" VARCHAR(64) NOT NULL,
  "referrer" VARCHAR(500),
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AggregatedView" (
  "id" SERIAL PRIMARY KEY,
  "contentType" VARCHAR(50) NOT NULL,
  "contentId" INTEGER NOT NULL,
  "contentSlug" VARCHAR(255) NOT NULL,
  "date" DATE NOT NULL,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "uniqueCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "PageView_contentType_contentId_idx" ON "PageView"("contentType", "contentId");
CREATE INDEX "PageView_timestamp_idx" ON "PageView"("timestamp");
CREATE INDEX "PageView_sessionHash_timestamp_idx" ON "PageView"("sessionHash", "timestamp");
CREATE INDEX "PageView_contentType_timestamp_idx" ON "PageView"("contentType", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AggregatedView_contentType_contentId_date_key" ON "AggregatedView"("contentType", "contentId", "date");
CREATE INDEX "AggregatedView_contentType_contentId_idx" ON "AggregatedView"("contentType", "contentId");
CREATE INDEX "AggregatedView_date_idx" ON "AggregatedView"("date");
```

### Environment Variables

No new environment variables required - uses existing:
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis)

## Conclusion

This privacy-friendly analytics system provides essential insights into content performance while maintaining strict privacy standards. By leveraging existing infrastructure and implementing smart caching, it delivers a lightweight, performant solution that respects user privacy and complies with modern data protection regulations.

The phased approach allows for incremental delivery, with the core tracking and basic dashboard available within 2-3 weeks, and advanced features rolled out progressively based on actual usage and feedback.
