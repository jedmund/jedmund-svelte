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

-- Posts table (for /universe)
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  post_type VARCHAR(50) NOT NULL, -- blog, microblog, link, photo, album
  title VARCHAR(255), -- Optional for microblog posts
  content JSONB, -- Edra JSON for blog/microblog, optional for others
  excerpt TEXT,

  -- Type-specific fields
  link_url VARCHAR(500), -- For link posts
  link_description TEXT, -- For link posts
  photo_id INTEGER REFERENCES photos(id), -- For photo posts
  album_id INTEGER REFERENCES albums(id), -- For album posts

  featured_image VARCHAR(500),
  tags JSONB, -- Array of tags
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Albums table
CREATE TABLE albums (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE,
  location VARCHAR(255),
  cover_photo_id INTEGER REFERENCES photos(id),
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

-- Media table (general uploads)
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

#### Media Table Enhancement

```sql
-- Add content associations to media table
ALTER TABLE media ADD COLUMN used_in JSONB DEFAULT '[]';
-- Example: [{ "type": "post", "id": 1 }, { "type": "project", "id": 3 }]
```

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

### 5. Media Library Component

- **Modal Interface**: Opens from Edra toolbar or form fields
- **Features**:
  - Grid view of all uploaded media
  - Search by filename
  - Filter by type (image/video)
  - Filter by usage (unused/used)
  - Upload new files
  - Select existing media
- **Returns**: Media object with ID and URLs

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
GET / api / projects
POST / api / projects
GET / api / projects / [slug]
PUT / api / projects / [id]
DELETE / api / projects / [id]

// Posts
GET / api / posts
POST / api / posts
GET / api / posts / [slug]
PUT / api / posts / [id]
DELETE / api / posts / [id]

// Albums & Photos
GET / api / albums
POST / api / albums
GET / api / albums / [slug]
PUT / api / albums / [id]
DELETE / api / albums / [id]
POST / api / albums / [id] / photos
DELETE / api / photos / [id]
PUT / api / photos / [id] / order

// Media upload
POST / api / media / upload
POST / api / media / bulk - upload
GET / api / media // Browse with filters
DELETE / api / media / [id] // Delete if unused
GET / api / media / [id] / usage // Check where media is used
```

### 8. Media Management & Cleanup

#### Orphaned Media Prevention

- **Reference Tracking**: `used_in` field tracks all content using each media item
- **On Save**: Update media associations when content is saved
- **On Delete**: Remove associations when content is deleted
- **Cleanup Task**: Periodic job to identify truly orphaned media

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
- **Dashboard**: Overview of all content types
- **Content Lists**:
  - Projects with preview thumbnails
  - Posts with publish status
  - Albums with photo counts
- **Content Editors**: Type-specific editing interfaces
- **Media Library**: Browse all uploaded files

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
7. **Post Types**: Universe will support multiple post types:
   - **Blog Post**: Title + long-form Edra content
   - **Microblog**: No title, short-form Edra content
   - **Link Post**: URL + optional commentary
   - **Photo Post**: Single photo + caption
   - **Album Post**: Reference to photo album

## Current Status (December 2024)

### Completed

- ✅ Database setup with Prisma and PostgreSQL
- ✅ Media management system with Cloudinary integration
- ✅ Admin foundation (layout, navigation, auth, forms, data tables)
- ✅ Edra rich text editor integration for case studies
- ✅ Edra image uploads configured to use media API
- ✅ Local development mode for media uploads (no Cloudinary usage)
- ✅ Project CRUD system with metadata fields and enhanced schema
- ✅ Project list view in admin with enhanced UI
- ✅ Project forms with branding (logo, colors) and styling
- ✅ Posts CRUD system with all post types (blog, microblog, link, photo, album)
- ✅ Posts list view and editor in admin
- ✅ Complete database schema matching PRD requirements
- ✅ Media API endpoints with upload, bulk upload, and usage tracking
- ✅ Component library for admin interface (buttons, inputs, modals, etc.)
- ✅ Test page for verifying upload functionality

### In Progress

- 🔄 Albums/Photos System - Schema implemented, UI components needed

### Next Steps

1. **Media Library System** (Critical dependency for other features)

   - Media library modal component
   - Integration with existing media APIs
   - Search and filter functionality within media browser

2. **Albums & Photos Management Interface**

   - Album creation and management UI
   - Bulk photo upload interface with progress
   - Photo ordering within albums
   - Album cover selection
   - EXIF data extraction and display

3. **Enhanced Content Features**

   - Photo/album post selectors using media library
   - Featured image picker for projects
   - Technology tag selector for projects
   - Auto-save functionality for all editors
   - Gallery manager for project images

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
- [x] Build media library API endpoints
- [x] Create media association tracking system
- [x] Add bulk upload endpoint for photos
- [x] Create media usage tracking queries

### Phase 3: Admin Foundation

- [x] Create admin layout component
- [x] Build admin navigation with content type switcher
- [x] Implement admin authentication (basic for now)
- [x] Create reusable form components (Button, Input, Modal, etc.)
- [x] Build data table component for list views
- [x] Add loading and error states
- [x] Create comprehensive admin UI component library
- [ ] Create media library modal component

### Phase 4: Posts System (All Types)

- [x] Create Edra Svelte wrapper component
- [x] Implement custom image block for Edra
- [x] Build post type selector UI
- [x] Create blog/microblog post editor
- [x] Build link post form
- [x] Create posts list view in admin
- [x] Implement post CRUD APIs
- [x] Post editor page with type-specific fields
- [x] Complete posts database schema with all post types
- [x] Posts administration interface
- [ ] Create photo post selector (needs media library modal)
- [ ] Build album post selector (needs albums system)
- [ ] Add auto-save functionality

### Phase 5: Projects System

- [x] Build project form with all metadata fields
- [x] Enhanced schema with branding fields (logo, colors)
- [x] Project branding and styling forms
- [x] Add optional Edra editor for case studies
- [x] Create project CRUD APIs
- [x] Build project list view with enhanced UI
- [ ] Create technology tag selector
- [ ] Implement featured image picker (needs media library modal)
- [ ] Build gallery manager with drag-and-drop ordering
- [ ] Add project ordering functionality

### Phase 6: Photos & Albums System

- [x] Complete database schema for albums and photos
- [x] Photo/album CRUD API endpoints (albums endpoint exists)
- [ ] Create album management interface
- [ ] Build bulk photo uploader with progress
- [ ] Implement EXIF data extraction for photos
- [ ] Implement drag-and-drop photo ordering
- [ ] Add individual photo publishing UI
- [ ] Build photo metadata editor
- [ ] Implement album cover selection
- [ ] Add "show in universe" toggle for albums

### Phase 7: Public Display Updates

- [ ] Replace static Work page with dynamic data
- [ ] Update project detail pages
- [ ] Build Universe mixed feed component
- [ ] Create different card types for each post type
- [ ] Update Photos page with dynamic albums/photos
- [ ] Implement individual photo pages
- [ ] Add Universe post detail pages
- [ ] Ensure responsive design throughout

### Phase 8: RSS Feeds & Final Polish

- [ ] Implement RSS feed for projects
- [ ] Create RSS feed for Universe posts
- [ ] Add RSS feed for photos/albums
- [ ] Implement combined RSS feed
- [ ] Add OpenGraph meta tags
- [ ] Optimize image loading and caching
- [ ] Add search functionality to admin
- [ ] Performance optimization pass

### Phase 9: Production Deployment

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

## Success Metrics

- Can create and publish any content type within 2-3 minutes
- Content appears on site immediately after publishing
- Bulk photo upload handles 50+ images smoothly
- No accidental data loss (auto-save works reliably)
- Page load performance remains fast (<2s)
- Admin interface works well on tablet/desktop
- Media uploads show progress and handle failures gracefully
- RSS feeds update automatically with new content
