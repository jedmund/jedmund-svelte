# Product Requirements Document: Media Library Modal System

## Overview

Implement a comprehensive Media Library modal system that provides a unified interface for browsing, selecting, and managing media across all admin forms. **The primary workflow is direct upload from computer within forms**, with the Media Library serving as a secondary browsing interface and management tool for previously uploaded content.

## 📋 Updated Approach Summary

**🎯 Primary Focus**: Direct upload components that allow users to drag-and-drop or browse files directly within project/post/album forms, with immediate preview and alt text capture.

**🎯 Secondary Feature**: Media Library modal for selecting previously uploaded content when needed.

**🎯 Key Addition**: Alt text storage and editing capabilities for accessibility compliance and SEO.

## Goals

### Primary Goals (Direct Upload Workflow)
- **Enable direct file upload within forms** where content will be used (projects, posts, albums)
- **Provide immediate upload and preview** without requiring navigation to separate media management
- **Store comprehensive metadata** including alt text for accessibility and SEO
- **Support drag-and-drop and click-to-browse** for intuitive file selection

### Secondary Goals (Media Library Browser)
- Create a reusable media browser for **selecting previously uploaded content**
- Provide **media management interface** showing where files are referenced
- Enable **bulk operations** and **metadata editing** (especially alt text)
- Support **file organization** and **usage tracking**

### Technical Goals
- Maintain consistent UX across all media interactions
- Support different file type filtering based on context
- Integrate seamlessly with existing admin components

## Current State Analysis

### ✅ What We Have
- Complete media API (`/api/media`, `/api/media/upload`, `/api/media/bulk-upload`)
- Media management page with grid/list views and search/filtering
- Modal base component (`Modal.svelte`)
- Complete admin UI component library (Button, Input, etc.)
- Media upload infrastructure with Cloudinary integration
- Pagination and search functionality

### 🎯 What We Need

#### High Priority (Direct Upload Focus)
- **Enhanced upload components** with immediate preview and metadata capture
- **Alt text input fields** for accessibility compliance
- **Direct upload integration** in form components (ImagePicker, GalleryManager)
- **Metadata management** during upload process

#### Medium Priority (Media Library Browser)
- Reusable MediaLibraryModal component for browsing existing content
- Selection state management for previously uploaded files
- Usage tracking and reference management

#### Database Updates Required
- Add `alt_text` field to Media table
- Add `usage_references` or similar tracking for where media is used

## Workflow Priorities

### 🥇 Primary Workflow: Direct Upload in Forms
This is the **main workflow** that users will use 90% of the time:

1. **User creates content** (project, post, album)
2. **User uploads files directly** in the form where they'll be used
3. **Files are immediately processed** and previewed
4. **Alt text and metadata** are captured during upload
5. **Content is saved** with proper media references

**Key Components**:
- `ImageUploader` - Direct drag-and-drop/click upload with preview
- `GalleryUploader` - Multiple file upload with immediate gallery preview
- `MediaMetadataForm` - Alt text and description capture during upload

### 🥈 Secondary Workflow: Browse Existing Media
This workflow is for **reusing previously uploaded content**:

1. **User needs to select existing media** (rare case)
2. **User clicks "Browse Library"** (secondary button)
3. **Media Library Modal opens** showing all uploaded files
4. **User selects from existing content**
5. **Media references are updated**

**Key Components**:
- `MediaLibraryModal` - Browse and select existing media
- `MediaSelector` - Grid interface for selection
- `MediaManager` - Edit alt text and view usage

## Technical Requirements

### 1. Enhanced Upload Components (Primary)

#### ImageUploader Component
**Purpose**: Direct image upload with immediate preview and metadata capture

```typescript
interface ImageUploaderProps {
  label: string
  value?: Media | null
  onUpload: (media: Media) => void
  aspectRatio?: string
  required?: boolean
  error?: string
  allowAltText?: boolean  // Enable alt text input
  maxFileSize?: number    // MB limit
}
```

**Features**:
- Drag-and-drop upload zone with visual feedback
- Click to browse files from computer
- Immediate image preview with proper aspect ratio
- Alt text input field (when enabled)
- Upload progress indicator
- File validation with helpful error messages
- Replace/remove functionality

#### GalleryUploader Component
**Purpose**: Multiple file upload with gallery preview and reordering

```typescript
interface GalleryUploaderProps {
  label: string
  value?: Media[]
  onUpload: (media: Media[]) => void
  onReorder?: (media: Media[]) => void
  maxItems?: number
  allowAltText?: boolean
  required?: boolean
  error?: string
}
```

**Features**:
- Multiple file drag-and-drop
- Immediate gallery preview grid
- Individual alt text inputs for each image
- Drag-and-drop reordering
- Individual remove buttons
- Bulk upload progress

### 2. MediaLibraryModal Component (Secondary)

**Purpose**: Main modal component that wraps the media browser functionality

**Props Interface**:
```typescript
interface MediaLibraryModalProps {
  isOpen: boolean
  mode: 'single' | 'multiple'
  fileType?: 'image' | 'video' | 'all'
  onSelect: (media: Media | Media[]) => void
  onClose: () => void
  selectedIds?: number[]  // Pre-selected items
  title?: string          // Modal title
  confirmText?: string    // Confirm button text
}
```

**Features**:
- Modal overlay with proper focus management
- Header with title and close button
- Media browser grid with selection indicators
- Search and filter controls
- Upload area with drag-and-drop
- Footer with selection count and action buttons
- Responsive design (desktop and tablet)

### 2. MediaSelector Component

**Purpose**: The actual media browsing interface within the modal

**Features**:
- Grid layout with thumbnail previews
- Individual item selection with visual feedback
- Keyboard navigation support
- Loading states and error handling
- "Select All" / "Clear Selection" bulk actions (for multiple mode)

**Item Display**:
- Thumbnail image
- Filename (truncated)
- File size and dimensions
- Usage indicator (if used elsewhere)
- Selection checkbox/indicator

### 3. MediaUploader Component

**Purpose**: Handle file uploads within the modal

**Features**:
- Drag-and-drop upload zone
- Click to browse files
- Upload progress indicators
- Error handling and validation
- Multiple file upload support
- Automatic refresh of media grid after upload

**Validation**:
- File type restrictions based on context
- File size limits (10MB per file)
- Maximum number of files for bulk upload

### 4. Form Integration Components

#### MediaInput Component
**Purpose**: Generic input field that opens media library modal

```typescript
interface MediaInputProps {
  label: string
  value?: Media | Media[] | null
  mode: 'single' | 'multiple'
  fileType?: 'image' | 'video' | 'all'
  onSelect: (media: Media | Media[] | null) => void
  placeholder?: string
  required?: boolean
  error?: string
}
```

**Display**:
- Label and optional required indicator
- Preview of selected media (thumbnail + filename)
- "Browse" button to open modal
- "Clear" button to remove selection
- Error state display

#### ImagePicker Component
**Purpose**: Specialized single image selector with enhanced preview

```typescript
interface ImagePickerProps {
  label: string
  value?: Media | null
  onSelect: (media: Media | null) => void
  aspectRatio?: string    // e.g., "16:9", "1:1"
  placeholder?: string
  required?: boolean
  error?: string
}
```

**Display**:
- Large preview area with placeholder
- Image preview with proper aspect ratio
- Overlay with "Change" and "Remove" buttons on hover
- Upload progress indicator

#### GalleryManager Component
**Purpose**: Multiple image selection with drag-and-drop reordering

```typescript
interface GalleryManagerProps {
  label: string
  value?: Media[]
  onSelect: (media: Media[]) => void
  onReorder?: (media: Media[]) => void
  maxItems?: number
  required?: boolean
  error?: string
}
```

**Display**:
- Grid of selected images with reorder handles
- "Add Images" button to open modal
- Individual remove buttons on each image
- Drag-and-drop reordering with visual feedback

## User Experience Flows

### 🥇 Primary Flow: Direct Upload in Forms

#### 1. Single Image Upload (Project Featured Image)
1. **User creates/edits project** and reaches featured image field
2. **User drags image file** directly onto ImageUploader component OR clicks to browse
3. **File is immediately uploaded** with progress indicator
4. **Image preview appears** with proper aspect ratio
5. **Alt text input field appears** below preview (if enabled)
6. **User enters alt text** for accessibility
7. **Form can be saved** with media reference and metadata

#### 2. Multiple Image Upload (Project Gallery)
1. **User reaches gallery section** of project form
2. **User drags multiple files** onto GalleryUploader OR clicks to browse multiple
3. **Upload progress shown** for each file individually
4. **Gallery grid appears** with all uploaded images
5. **Alt text inputs available** for each image
6. **User can reorder** images with drag-and-drop
7. **User can remove** individual images with X button
8. **Form saves** with complete gallery and metadata

#### 3. Media Management and Alt Text Editing
1. **User visits Media Library page** to manage uploaded content
2. **User clicks on any media item** to open details modal
3. **User can edit alt text** and other metadata
4. **User can see usage references** (which projects/posts use this media)
5. **Changes are saved** and reflected wherever media is used

### 🥈 Secondary Flow: Browse Existing Media

#### 1. Selecting Previously Uploaded Image
1. **User clicks "Browse Library"** button (secondary option in forms)
2. **MediaLibraryModal opens** showing all previously uploaded media
3. **User browses or searches** existing content
4. **User selects image** and confirms selection
5. **Modal closes** and form shows selected media with existing alt text

#### 2. Managing Media Library
1. **User visits dedicated Media Library page**
2. **User can view all uploaded media** in grid/list format
3. **User can edit metadata** including alt text for any media
4. **User can see usage tracking** - which content references each media
5. **User can perform bulk operations** like deleting unused media

## Design Specifications

### Modal Layout
- **Width**: 1200px max, responsive on smaller screens
- **Height**: 80vh max with scroll
- **Grid**: 4-6 columns depending on screen size
- **Item Size**: 180px × 140px thumbnails

### Visual States
- **Default**: Border with subtle background
- **Selected**: Blue border and checkmark overlay
- **Hover**: Slight scale and shadow effect
- **Loading**: Skeleton loader animation
- **Upload**: Progress overlay with percentage

### Colors (Using Existing Variables)
- **Selection**: `$blue-60` for selected state
- **Hover**: `$grey-10` background
- **Upload Progress**: `$green-60` for success, `$red-60` for error

## API Integration

### Endpoints Used
- `GET /api/media` - Browse media with search/filter/pagination
- `POST /api/media/upload` - Single file upload
- `POST /api/media/bulk-upload` - Multiple file upload

### Search and Filtering
- **Search**: By filename (case-insensitive)
- **Filter by Type**: image/*, video/*, all
- **Filter by Usage**: unused only, all
- **Sort**: Most recent first

### Pagination
- 24 items per page
- Infinite scroll or traditional pagination
- Loading states during page changes

## Implementation Plan

### Phase 1: Database Schema Updates (Required First)
1. **Add Alt Text Support**
   ```sql
   ALTER TABLE media ADD COLUMN alt_text TEXT;
   ALTER TABLE media ADD COLUMN description TEXT;
   ```

2. **Add Usage Tracking (Optional)**
   ```sql
   -- Track where media is referenced
   CREATE TABLE media_usage (
     id SERIAL PRIMARY KEY,
     media_id INTEGER REFERENCES media(id),
     content_type VARCHAR(50), -- 'project', 'post', 'album'
     content_id INTEGER,
     field_name VARCHAR(100), -- 'featured_image', 'gallery', etc.
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### Phase 2: Direct Upload Components (High Priority)
1. **ImageUploader Component**
   - Drag-and-drop upload zone with visual feedback
   - Immediate upload and preview functionality
   - Alt text input integration
   - Replace existing ImagePicker with upload-first approach

2. **GalleryUploader Component**
   - Multiple file drag-and-drop
   - Individual alt text inputs per image
   - Drag-and-drop reordering
   - Remove individual images functionality

3. **Upload API Enhancement**
   - Accept alt text in upload request
   - Return complete media object with metadata
   - Handle batch uploads with individual alt text

### Phase 3: Form Integration (High Priority)
1. **Project Forms Enhancement**
   - Replace logo field with ImageUploader
   - Add featured image with ImageUploader
   - Implement gallery section with GalleryUploader
   - Add secondary "Browse Library" buttons

2. **Post Forms Enhancement**
   - Photo post type with GalleryUploader
   - Album creation with GalleryUploader
   - Featured image selection for text posts

### Phase 4: Media Library Management (Medium Priority)
1. **Enhanced Media Library Page**
   - Alt text editing for existing media
   - Usage tracking display (shows where media is used)
   - Bulk alt text editing
   - Search and filter by alt text

2. **MediaLibraryModal for Selection**
   - Browse existing media interface
   - Single and multiple selection modes
   - Integration as secondary option in forms

### Phase 5: Polish and Advanced Features (Low Priority)
1. **Advanced Upload Features**
   - Image resizing/optimization options
   - Automatic alt text suggestions (AI integration)
   - Bulk upload with CSV metadata import

2. **Usage Analytics**
   - Dashboard showing media usage statistics
   - Unused media cleanup tools
   - Duplicate detection and management

## Success Criteria

### Functional Requirements

#### Primary Workflow (Direct Upload)
- [ ] **Drag-and-drop upload works** in all form components
- [ ] **Click-to-browse file selection** works reliably  
- [ ] **Immediate upload and preview** happens without page navigation
- [ ] **Alt text input appears** and saves with uploaded media
- [ ] **Upload progress** is clearly indicated with percentage
- [ ] **Error handling** provides helpful feedback for failed uploads
- [ ] **Multiple file upload** works with individual progress tracking
- [ ] **Gallery reordering** works with drag-and-drop after upload

#### Secondary Workflow (Media Library)
- [ ] **Media Library Modal** opens and closes properly with smooth animations
- [ ] **Single and multiple selection** modes work correctly
- [ ] **Search and filtering** return accurate results  
- [ ] **Usage tracking** shows where media is referenced
- [ ] **Alt text editing** works in Media Library management
- [ ] **All components are keyboard accessible**

### Performance Requirements
- [ ] Modal opens in under 200ms
- [ ] Media grid loads in under 1 second
- [ ] Search results appear in under 500ms
- [ ] Upload progress updates in real-time
- [ ] No memory leaks when opening/closing modal multiple times

### UX Requirements
- [ ] Interface is intuitive without instruction
- [ ] Visual feedback is clear for all interactions
- [ ] Error messages are helpful and actionable
- [ ] Mobile/tablet interface is fully functional
- [ ] Loading states prevent user confusion

## Technical Considerations

### State Management
- Use Svelte runes for reactive state
- Maintain selection state during modal lifecycle
- Handle API loading and error states properly

### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management when modal opens/closes
- Screen reader announcements for state changes

### Performance
- Lazy load thumbnails as they come into view
- Debounce search input to prevent excessive API calls
- Efficient reordering without full re-renders
- Memory cleanup when modal is closed

### Error Handling
- Network failure recovery
- Upload failure feedback
- File validation error messages
- Graceful degradation for missing thumbnails

## Future Enhancements

### Nice-to-Have Features
- **Bulk Operations**: Delete multiple files, bulk tag editing
- **Advanced Search**: Search by tags, date range, file size
- **Preview Mode**: Full-size preview with navigation
- **Folder Organization**: Create folders/categories for organization
- **Smart Suggestions**: Recently used, similar images
- **Crop Tool**: Basic cropping interface within modal
- **Alt Text Editor**: Quick alt text editing for accessibility

### Integration Opportunities
- **CDN Optimization**: Automatic image optimization settings
- **AI Tagging**: Automatic tag generation for uploaded images
- **Duplicate Detection**: Warn about similar/duplicate uploads
- **Usage Analytics**: Track which media is used most frequently

## Development Checklist

### Core Components
- [ ] MediaLibraryModal base structure
- [ ] MediaSelector with grid layout
- [ ] MediaUploader with drag-and-drop
- [ ] Search and filter interface
- [ ] Pagination implementation

### Form Integration
- [ ] MediaInput generic component
- [ ] ImagePicker specialized component
- [ ] GalleryManager with reordering
- [ ] Integration with existing project forms
- [ ] Integration with post forms

### Polish and Testing
- [ ] Responsive design implementation
- [ ] Accessibility testing and fixes
- [ ] Performance optimization
- [ ] Error state handling
- [ ] Cross-browser testing
- [ ] Mobile device testing

This Media Library system will serve as the foundation for all media-related functionality in the CMS, enabling rich content creation across projects, posts, and albums.