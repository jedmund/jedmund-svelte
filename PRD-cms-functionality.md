# Product Requirements Document: Multi-Content CMS

## Overview

Add a comprehensive CMS to the personal portfolio site to manage multiple content types: Projects (Work section), Posts (Universe section), and Photos/Albums (Photos and Universe sections).

## Goals

- Enable dynamic content creation across all site sections
- Provide rich text editing for long-form content (Edra)
- Support different content types with appropriate editing interfaces
- Store all content in PostgreSQL database (Railway-compatible)
- Display content instantly after publishing
- Maintain the existing design aesthetic

## Technical Constraints

- **Hosting**: Railway (no direct file system access)
- **Database**: PostgreSQL add-on available
- **Framework**: SvelteKit
- **Editor**: Edra for rich text (https://edra.tsuzat.com/docs), custom forms for structured data

## Core Features

### 1. Database Schema

```sql
-- Projects table (for /work)
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  year INTEGER NOT NULL,
  client VARCHAR(255),
  role VARCHAR(255),
  technologies JSONB, -- Array of tech stack
  featured_image VARCHAR(500),
  gallery JSONB, -- Array of image URLs
  external_url VARCHAR(500),
  case_study_content JSONB, -- Edra JSON format
  display_order INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table (for /universe) - Simplified to 2 types
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  post_type VARCHAR(50) NOT NULL, -- 'post' or 'essay'
  title VARCHAR(255), -- Required for essays, optional for posts
  content JSONB, -- Edra JSON content
  excerpt TEXT, -- For essays

  featured_image VARCHAR(500),
  attachments JSONB, -- Array of media IDs for any attachments
  tags JSONB, -- Array of tags
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Albums table - Enhanced with photography curation
CREATE TABLE albums (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE,
  location VARCHAR(255),
  cover_photo_id INTEGER REFERENCES photos(id),
  is_photography BOOLEAN DEFAULT false, -- Show in photos experience
  status VARCHAR(50) DEFAULT 'draft',
  show_in_universe BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photos table
CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  width INTEGER,
  height INTEGER,
  exif_data JSONB,
  caption TEXT,
  display_order INTEGER DEFAULT 0,

  -- Individual publishing support
  slug VARCHAR(255) UNIQUE, -- Only if published individually
  title VARCHAR(255), -- Optional title for individual photos
  description TEXT, -- Longer description when published solo
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMP,
  show_in_photos BOOLEAN DEFAULT true, -- Show in photos page when published solo

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media table (general uploads) - Enhanced with photography curation
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255), -- Original filename from user
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT, -- Alt text for accessibility
  description TEXT, -- Optional description
  is_photography BOOLEAN DEFAULT false, -- Star for photos experience
  used_in JSONB DEFAULT '[]', -- Legacy tracking field
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media usage tracking table
CREATE TABLE media_usage (
  id SERIAL PRIMARY KEY,
  media_id INTEGER REFERENCES media(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'project', 'post', 'album'
  content_id INTEGER NOT NULL,
  field_name VARCHAR(100) NOT NULL, -- 'featuredImage', 'logoUrl', 'gallery', 'content', 'attachments'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(media_id, content_type, content_id, field_name)
);
```

### 2. Image Handling Strategy

#### For Posts (Edra Integration)

- **Storage**: Images embedded in posts are stored in the `media` table
- **Edra Custom Block**: Create custom image block that:
  - Uploads to `/api/media/upload` on drop/paste
  - Returns media ID and URL
  - Stores reference as `{ type: "image", mediaId: 123, url: "...", alt: "..." }`
- **Advantages**:
  - Images flow naturally with content
  - Can add captions, alt text inline
  - Supports drag-and-drop repositioning
  - No orphaned images (tracked by mediaId)

#### For Projects

- **Featured Image**: Single image reference stored in `featured_image` field
- **Gallery Images**: Array of media IDs stored in `gallery` JSONB field
- **Case Study Content**: Uses same Edra approach as Posts
- **Storage Pattern**:
  ```json
  {
  	"featured_image": "https://cdn.../image1.jpg",
  	"gallery": [
  		{ "mediaId": 123, "url": "...", "caption": "..." },
  		{ "mediaId": 124, "url": "...", "caption": "..." }
  	]
  }
  ```

#### Media Usage Tracking System

The system now uses a dedicated `media_usage` table for robust tracking:

```sql
-- MediaUsage tracks where each media file is used
-- Replaces the simple used_in JSONB field with proper relational tracking
-- Enables complex queries like "show all projects using this media"
-- Supports bulk operations and reference cleanup
```

**Benefits:**
- Accurate usage tracking across all content types
- Efficient queries for usage information
- Safe bulk deletion with automatic reference cleanup
- Detailed tracking by field (featuredImage, gallery, content, etc.)

### 3. Content Type Editors

- **Projects**: Form-based editor with:
  - Metadata fields (title, year, client, role)
  - Technology tag selector
  - Featured image picker (opens media library)
  - Gallery manager (grid view with reordering)
  - Optional Edra editor for case studies
- **Posts**: Full Edra editor with:
  - Custom image block implementation
  - Drag-and-drop image upload
  - Media library integration
  - Image optimization on upload
  - Auto-save including image references
- **Photos/Albums**: Media-focused interface with:
  - Bulk photo upload
  - Drag-and-drop ordering
  - EXIF data extraction
  - Album metadata editing

### 4. Edra Custom Image Block

```typescript
// Custom image block schema for Edra
const ImageBlock = {
  type: "image",
  content: {
    mediaId: number,
    url: string,
    thumbnailUrl?: string,
    alt?: string,
    caption?: string,
    width?: number,
    height?: number,
    alignment?: "left" | "center" | "right" | "full"
  }
}

// Example Edra content with images
{
  "blocks": [
    { "type": "heading", "content": "Project Overview" },
    { "type": "paragraph", "content": "This project..." },
    {
      "type": "image",
      "content": {
        "mediaId": 123,
        "url": "https://cdn.../full.jpg",
        "thumbnailUrl": "https://cdn.../thumb.jpg",
        "alt": "Project screenshot",
        "caption": "The main dashboard view",
        "alignment": "full"
      }
    },
    { "type": "paragraph", "content": "As shown above..." }
  ]
}
```

### 5. Media Library System

#### Media Library Component

- **Modal Interface**: Opens from Edra toolbar, form fields, or Browse Library buttons
- **Features**:
  - Grid and list view modes for uploaded media
  - Search by filename and filter by type (image/video/audio/pdf)
  - Usage information showing where each media is used
  - Alt text editing and accessibility features
  - Upload new files directly from modal
  - Single and multi-select functionality
- **Returns**: Media object with ID and URLs

#### Multiselect & Bulk Operations

- **Selection Interface**: Checkbox-based selection in both grid and list views
- **Bulk Actions**:
  - Select All / Clear Selection controls
  - Bulk delete with confirmation
  - Progress indicators and loading states
- **Safe Deletion**: Automatic reference cleanup across all content types
- **Reference Tracking**: Shows exactly where each media file is used before deletion

### 6. Image Processing Pipeline

1. **Upload**: User drops/selects image
2. **Processing**:
   - Generate unique filename
   - Create multiple sizes:
     - Thumbnail (300px)
     - Medium (800px)
     - Large (1600px)
     - Original
   - Extract metadata (dimensions, EXIF)
3. **Storage**: Upload to CDN
4. **Database**: Create media record with all URLs
5. **Association**: Update `used_in` when embedded

### 7. API Endpoints

```typescript
// Projects
GET /api/projects
POST /api/projects
GET /api/projects/[slug]
PUT /api/projects/[id]
DELETE /api/projects/[id]

// Posts
GET /api/posts
POST /api/posts
GET /api/posts/[slug]
PUT /api/posts/[id]
DELETE /api/posts/[id]

// Albums & Photos
GET /api/albums
POST /api/albums
GET /api/albums/[slug]
PUT /api/albums/[id]
DELETE /api/albums/[id]
POST /api/albums/[id]/photos
DELETE /api/photos/[id]
PUT /api/photos/[id]/order

// Media Management
POST /api/media/upload           // Single file upload
POST /api/media/bulk-upload      // Multiple file upload
GET /api/media                   // Browse with filters, pagination
GET /api/media/[id]              // Get single media item
PUT /api/media/[id]              // Update media (alt text, description)
DELETE /api/media/[id]           // Delete single media item
DELETE /api/media/bulk-delete    // Delete multiple media items
GET /api/media/[id]/usage        // Check where media is used
POST /api/media/backfill-usage   // Backfill usage tracking for existing content
```

### 8. Media Management & Cleanup

#### Advanced Usage Tracking

- **MediaUsage Table**: Dedicated table for precise tracking of media usage
- **Automatic Tracking**: All content saves automatically update usage references
- **Field-Level Tracking**: Tracks specific fields (featuredImage, gallery, content, attachments)
- **Content Type Support**: Projects, Posts, Albums with full reference tracking
- **Real-time Usage Display**: Shows exactly where each media file is used

#### Safe Deletion System

- **Usage Validation**: Prevents deletion if media is in use (unless forced)
- **Reference Cleanup**: Automatically removes deleted media from all content
- **Bulk Operations**: Multi-select deletion with comprehensive reference cleanup
- **Rich Text Cleanup**: Removes deleted media from Edra editor content (images, galleries)
- **Atomic Operations**: All-or-nothing deletion ensures data consistency

#### Edra Integration Details

```javascript
// Custom upload handler for BlockNote
const handleImageUpload = async (file) => {
	const formData = new FormData()
	formData.append('file', file)
	formData.append('context', 'post') // or 'project'

	const response = await fetch('/api/media/upload', {
		method: 'POST',
		body: formData
	})

	const media = await response.json()

	// Return format expected by Edra
	return {
		mediaId: media.id,
		url: media.url,
		thumbnailUrl: media.thumbnail_url,
		width: media.width,
		height: media.height
	}
}
```

### 9. Admin Interface

- **Route**: `/admin` (completely separate from public routes)
- **Dashboard**: Overview of all content types with quick stats
- **Content Lists**:
  - Projects with preview thumbnails and status indicators
  - Posts with publish status and type badges
  - Albums with photo counts and metadata
- **Content Editors**: Type-specific editing interfaces with rich text support
- **Media Library**: Comprehensive media management with:
  - Grid and list view modes
  - Advanced search and filtering
  - Usage tracking and reference display
  - Alt text editing and accessibility features
  - Bulk operations with multiselect interface
  - Safe deletion with reference cleanup

### 10. Public Display Integration

- **Work page**: Dynamic project grid from database
- **Universe page**:
  - Mixed feed of posts and albums (marked with `show_in_universe`)
  - Chronological ordering
  - Different card styles for posts vs photo albums
- **Photos page**: Album grid with masonry layout
- **Individual pages**: `/work/[slug]`, `/universe/[slug]`, `/photos/[slug]`

## Implementation Phases

### Phase 1: Foundation (Week 1)

- Set up PostgreSQL database with full schema
- Create database connection utilities
- Implement media upload infrastructure
- Build admin route structure and navigation

### Phase 2: Content Types (Week 2-3)

- **Posts**: Edra integration, CRUD APIs
- **Projects**: Form builder, gallery management
- **Albums/Photos**: Bulk upload, EXIF extraction
- Create content type list views in admin

### Phase 3: Public Display (Week 4)

- Replace static project data with dynamic
- Build Universe mixed feed (posts + albums)
- Update Photos page with dynamic albums
- Implement individual content pages

### Phase 4: Polish & Optimization (Week 5)

- Image optimization and CDN caching
- Admin UI improvements
- Search and filtering
- Performance optimization

## Technical Decisions

### Database Choice: PostgreSQL

- Native JSON support for Edra content
- Railway provides managed PostgreSQL
- Familiar, battle-tested solution

### Media Storage Options

1. **Cloudinary** (Recommended)

   - Free tier sufficient for personal use
   - Automatic image optimization
   - Easy API integration

2. **AWS S3**
   - More control but requires AWS account
   - Additional complexity for signed URLs

### Image Integration Summary

- **Posts**: Use Edra's custom image blocks with inline placement
- **Projects**:
  - Featured image: Single media reference
  - Gallery: Array of media IDs with ordering
  - Case studies: Edra blocks (same as posts)
- **Albums**: Direct photos table relationship
- **Storage**: All images go through media table for consistent handling
- **Association**: Track usage with `used_in` JSONB field to prevent orphans

### Authentication (Future)

- Initially: No auth (rely on obscure admin URL)
- Future: Add simple password protection or OAuth

## Development Checklist

### Infrastructure

- [ ] Set up PostgreSQL on Railway
- [ ] Create database schema and migrations
- [ ] Set up Cloudinary/S3 for media storage
- [ ] Configure environment variables

### Dependencies

- [x] `edra` (Edra editor) - Integrated and configured
- [x] `@prisma/client` - Set up with complete schema
- [x] `cloudinary` - SDK integrated for image processing and storage
- [x] Form validation with built-in validation
- [ ] `exifr` for EXIF data extraction (needed for photos system)

### Admin Interface

- [x] Admin layout and navigation
- [x] Content type switcher (Dashboard, Projects, Universe, Media)
- [x] List views for projects and posts
- [x] Complete form system for Projects (metadata, branding, styling)
- [x] Edra wrapper for Posts with all post types
- [x] Comprehensive admin component library
- [ ] Photo uploader with drag-and-drop (for albums system)
- [ ] Media library browser modal

### APIs

- [x] CRUD endpoints for projects and posts
- [x] Media upload with progress
- [x] Bulk upload operations for media
- [x] Media usage tracking endpoints
- [ ] Albums CRUD endpoints (schema ready, UI needed)
- [ ] Bulk operations (delete, publish) for content
- [ ] Search and filtering endpoints

### Public Display

- [ ] Dynamic Work page
- [ ] Mixed Universe feed
- [ ] Photos masonry grid
- [ ] Individual content pages
- [ ] SEO meta tags

## Design Decisions

Based on requirements discussion:

1. **Albums**: No featured flag needed
2. **Version History**: Nice-to-have feature for future implementation
3. **Photo Publishing**: Individual photos can be published separately from albums
4. **Project Templates**: Defer case study layout templates for later phase
5. **Scheduled Publishing**: Not needed initially
6. **RSS Feeds**: Required for all content types (projects, posts, photos)
7. **Post Types**: Simplified to two main types:
   - **Post**: Simple content with optional attachments (replaces microblog, link, photo posts)
   - **Essay**: Full editor with title/metadata + optional attachments (replaces blog posts)
8. **Albums & Photo Curation**: Albums serve dual purposes:
   - **Regular Albums**: Collections for case studies, UI galleries, design process
   - **Photography Albums**: Curated collections for photo-centric experience
   - Both album and media levels have `isPhotography` flags for flexible curation
9. **Photo Curation Strategy**: Media items can be "starred for photos" regardless of usage context
   - Same photo can exist in posts AND photo collections
   - Editorial control over what constitutes "photography" vs "UI screenshots/sketches"
   - Photography albums can contain mixed content if editorially appropriate

## Current Status (June 2024)

### Completed

- ✅ Database setup with Prisma and PostgreSQL
- ✅ Media management system with Cloudinary integration
- ✅ Admin foundation (layout, navigation, auth, forms, data tables)
- ✅ Edra rich text editor integration for case studies and posts
- ✅ Edra image and gallery extensions with MediaLibraryModal integration
- ✅ Local development mode for media uploads (no Cloudinary usage)
- ✅ Project CRUD system with metadata fields and enhanced schema
- ✅ Project list view in admin with enhanced UI
- ✅ Project forms with branding (logo, colors) and styling
- ✅ Posts CRUD system with all post types (blog, microblog, link, photo, album)
- ✅ Posts attachments field for multiple image support
- ✅ Posts list view and editor in admin
- ✅ Complete database schema with MediaUsage tracking table
- ✅ Media API endpoints with upload, bulk upload, and usage tracking
- ✅ Component library for admin interface (buttons, inputs, modals, etc.)
- ✅ MediaLibraryModal for browsing and selecting media
- ✅ Media details modal with alt text editing and usage information
- ✅ Multiselect interface for bulk media operations
- ✅ Safe bulk deletion with automatic reference cleanup
- ✅ UniverseComposer with photo attachment support
- ✅ Form integration with Browse Library functionality (ImageUploader, GalleryUploader)
- ✅ Usage tracking backfill system for existing content
- ✅ **Project Password Protection & Visibility System** (June 2024)
  - ✅ Four project states: Published, List-only, Password-protected, Draft
  - ✅ Password protection with session storage
  - ✅ Visual indicators in project lists
  - ✅ Admin interface updates with status dropdown
  - ✅ API filtering for different visibility states
- ✅ **RSS Feed Best Practices Implementation** (June 2024)
  - ✅ Updated all RSS feeds with proper XML namespaces
  - ✅ Full content support via content:encoded
  - ✅ Enhanced HTTP headers with ETag and caching
  - ✅ RFC 822 date formatting throughout

### In Progress

- 🔄 Content Simplification & Photo Curation System

### Next Steps

1. **Content Model Updates** (Immediate Priority)

   - Add `isPhotography` field to Media and Album tables via migration
   - Simplify post types to just "post" and "essay"
   - Update post creation UI to use simplified types
   - Add photography toggle to media details modal
   - Add photography indicator pills in admin interface

2. **Albums & Photos Management Interface** 

   - Album creation and management UI with photography toggle
   - Bulk photo upload interface with progress
   - Photo ordering within albums
   - Album cover selection
   - EXIF data extraction and display
   - Photography album filtering and management

3. **Enhanced Content Features**

   - Featured image picker for projects (using MediaLibraryModal)
   - Technology tag selector for projects
   - Auto-save functionality for all editors
   - Gallery manager for project images with drag-and-drop

4. **Public Display Integration**

   - Dynamic Work page displaying projects from database
   - Universe page with mixed content feed (posts + essays)
   - Photos page with photography albums only
   - Individual content detail pages
   - SEO meta tags and OpenGraph integration

## Phased Implementation Plan

### Phase 0: Local Development Setup

- [x] Install local PostgreSQL (via Homebrew or Postgres.app)
- [x] Create local database
- [x] Set up local environment variables
- [x] Run Prisma migrations locally
- [x] Create mock data for testing
- [x] Test basic CRUD operations locally

### Phase 1: Database & Infrastructure Setup

- [x] Create all database tables with updated schema
- [x] Set up Prisma ORM with models
- [x] Create base API route structure
- [x] Implement database connection utilities
- [x] Set up error handling and logging
- [ ] Configure Cloudinary account (deferred to production setup)
- [ ] Set up PostgreSQL on Railway (deferred to production setup)

### Phase 2: Media Management System

- [x] Create media upload endpoint with Cloudinary integration
- [x] Implement image processing pipeline (multiple sizes)
- [x] Build media library API endpoints with pagination and filtering
- [x] Create advanced MediaUsage tracking system
- [x] Add bulk upload endpoint for photos
- [x] Build MediaLibraryModal component with search and selection
- [x] Implement media details modal with alt text editing
- [x] Create multiselect interface for bulk operations
- [x] Add safe bulk deletion with reference cleanup
- [x] Build usage tracking queries and backfill system

### Phase 3: Admin Foundation

- [x] Create admin layout component
- [x] Build admin navigation with content type switcher
- [x] Implement admin authentication (basic for now)
- [x] Create reusable form components (Button, Input, Modal, etc.)
- [x] Build data table component for list views
- [x] Add loading and error states
- [x] Create comprehensive admin UI component library
- [x] Build complete media library system with modals and management

### Phase 4: Posts System (All Types)

- [x] Create Edra Svelte wrapper component
- [x] Implement custom image and gallery blocks for Edra
- [x] Build post type selector UI
- [x] Create blog/microblog post editor
- [x] Build link post form
- [x] Create posts list view in admin
- [x] Implement post CRUD APIs with attachments support
- [x] Post editor page with type-specific fields
- [x] Complete posts database schema with attachments field
- [x] Posts administration interface
- [x] UniverseComposer with photo attachment support
- [x] Integrate MediaLibraryModal with Edra editor
- [ ] Build album post selector (needs albums system)
- [ ] Add auto-save functionality

### Phase 5: Projects System

- [x] Build project form with all metadata fields
- [x] Enhanced schema with branding fields (logo, colors)
- [x] Project branding and styling forms with ImageUploader and GalleryUploader
- [x] Add optional Edra editor for case studies with media support
- [x] Create project CRUD APIs with usage tracking
- [x] Build project list view with enhanced UI
- [x] Integrate Browse Library functionality in project forms
- [ ] Create technology tag selector
- [ ] Build gallery manager with drag-and-drop ordering
- [ ] Add project ordering functionality

### Phase 6: Content Simplification & Photo Curation

- [x] Add `isPhotography` field to Media table (migration)
- [x] Add `isPhotography` field to Album table (migration) 
- [x] Simplify post types to "post" and "essay" only
- [x] Update UniverseComposer to use simplified post types
- [x] Add photography toggle to MediaDetailsModal
- [x] Add photography indicator pills throughout admin interface
- [x] Update media and album APIs to handle photography flags

### Phase 7: Photos & Albums System

- [x] Complete database schema for albums and photos
- [x] Photo/album CRUD API endpoints (albums endpoint exists)
- [x] Create album management interface with photography toggle
- [x] **Album Photo Management** (Core functionality complete)
  - [x] Add photos to albums interface using MediaLibraryModal
  - [x] Remove photos from albums with confirmation
  - [x] Photo grid display with hover overlays
  - [x] Album-photo relationship API endpoints (POST /api/albums/[id]/photos, DELETE /api/photos/[id])
  - [ ] Photo reordering within albums (drag-and-drop)
  - [ ] Album cover photo selection
- [ ] Build bulk photo uploader with progress
- [ ] Implement EXIF data extraction for photos
- [ ] Add individual photo publishing UI
- [ ] Build photo metadata editor
- [ ] Add photography album filtering and management
- [ ] Add "show in universe" toggle for albums

### Phase 8: Public Display Updates

- [x] Replace static Work page with dynamic data
- [x] Update project detail pages
- [x] Build Universe mixed feed component  
- [x] Create different card types for each post type
- [x] Update Photos page with dynamic albums/photos
- [x] Implement individual photo pages
- [x] Add Universe post detail pages
- [ ] Ensure responsive design throughout

### Phase 9: RSS Feeds & Final Polish

- [ ] Implement RSS feed for projects
- [ ] Create RSS feed for Universe posts
- [ ] Add RSS feed for photos/albums
- [ ] Implement combined RSS feed
- [ ] Add OpenGraph meta tags
- [ ] Optimize image loading and caching
- [ ] Add search functionality to admin
- [ ] Performance optimization pass

### Phase 10: Production Deployment

- [ ] Set up PostgreSQL on Railway
- [ ] Run migrations on production database
- [ ] Configure Cloudinary for production
- [ ] Set up environment variables on Railway
- [ ] Test all endpoints in production
- [ ] Set up database backups
- [ ] Configure proper authentication
- [ ] Monitor logs and performance

### Future Enhancements (Post-Launch)

- [ ] Version history system
- [ ] More robust authentication
- [ ] Project case study templates
- [ ] Advanced media organization (folders/tags)
- [ ] Analytics integration
- [ ] Backup system

## Albums & Photos System Implementation

### Design Decisions Made (May 2024)

1. **Simplified Post Types**: Reduced from 5 types (blog, microblog, link, photo, album) to 2 types:
   - **Post**: Simple content with optional attachments (handles previous microblog, link, photo use cases)
   - **Essay**: Full editor with title/metadata + attachments (handles previous blog use cases)

2. **Photo Curation Strategy**: Dual-level curation system:
   - **Media Level**: `isPhotography` boolean - stars individual media for photo experience
   - **Album Level**: `isPhotography` boolean - marks entire albums for photo experience
   - **Mixed Content**: Photography albums can contain non-photography media (Option A)
   - **Default Behavior**: Both flags default to `false` to prevent accidental photo inclusion

3. **Visual Indicators**: Pill-shaped tags to indicate photography status in admin interface

4. **Album Flexibility**: Albums serve multiple purposes:
   - Regular albums for case studies, UI collections, design process
   - Photography albums for curated photo experience (Japan Trip, Street Photography)
   - Same album system, different curation flags

### Implementation Task List

#### Phase 1: Database Updates
- [x] Create migration to add `isPhotography` field to Media table
- [x] Create migration to add `isPhotography` field to Album table
- [x] Update Prisma schema with new fields
- [x] Test migrations on local database

#### Phase 2: API Updates
- [x] Update Media API endpoints to handle `isPhotography` flag
- [x] Update Album API endpoints to handle `isPhotography` flag
- [x] Update media usage tracking to work with new flags
- [x] Add filtering capabilities for photography content

#### Phase 3: Admin Interface Updates
- [x] Add photography toggle to MediaDetailsModal
- [x] Add photography indicator pills for media items (grid and list views)
- [x] Add photography indicator pills for albums
- [x] Update media library filtering to include photography status
- [x] Add bulk photography operations (mark/unmark multiple items)

#### Phase 4: Post Type Simplification
- [x] Update UniverseComposer to use only "post" and "essay" types
- [x] Remove complex post type selector UI
- [x] Update post creation flows
- [x] Migrate existing posts to simplified types (if needed)
- [x] Update post display logic to handle simplified types

#### Phase 5: Album Management System
- [x] Create album creation/editing interface with photography toggle
- [x] Build album list view with photography indicators
- [ ] **Critical Missing Feature: Album Photo Management**
  - [ ] Add photo management section to album edit page
  - [ ] Implement "Add Photos from Library" functionality using MediaLibraryModal
  - [ ] Create photo grid display within album editor
  - [ ] Add remove photo functionality (individual photos)
  - [ ] Implement drag-and-drop photo reordering within albums
  - [ ] Add album cover photo selection interface
  - [ ] Update album API to handle photo associations
  - [ ] Create album-photo relationship endpoints
- [ ] Add bulk photo upload to albums with automatic photography detection

#### Phase 6: Photography Experience
- [ ] Build photography album filtering in admin
- [ ] Create photography-focused views and workflows
- [ ] Add batch operations for photo curation
- [ ] Implement photography album public display
- [ ] Add photography vs regular album distinction in frontend

### Success Criteria

- Admin can quickly toggle media items between regular and photography status
- Albums can be easily marked for photography experience
- Post creation is simplified to 2 clear choices
- Photography albums display correctly in public photos section
- Mixed content albums (photography + other) display all content as intended
- Pill indicators clearly show photography status throughout admin interface

## Success Metrics

- Can create and publish any content type within 2-3 minutes
- Content appears on site immediately after publishing
- Bulk photo upload handles 50+ images smoothly
- No accidental data loss (auto-save works reliably)
- Page load performance remains fast (<2s)
- Admin interface works well on tablet/desktop
- Media uploads show progress and handle failures gracefully
- RSS feeds update automatically with new content
