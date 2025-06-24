# Product Requirements Document: Album System Redesign

## Summary of Changes

This PRD outlines a comprehensive redesign of the album system to transform albums from simple photo containers into rich photographic stories with enhanced content capabilities. The key changes include:

1. **Many-to-Many Photo-Album Relationships**: Enable a single photo to belong to multiple albums, providing greater flexibility in content organization
2. **Enhanced Photo Permalinks**: Display all associated albums on individual photo pages for better context
3. **Refined Collection Views**: Remove albums from public collection views while maintaining permalink access
4. **Rich Album Composer**: Implement an essay-style composer for albums allowing mixed text and photo content
5. **Geo-Location Features**: Add embedded map cards with point-of-interest markers for location-based storytelling

## Task List by Phase

### Additional Completed Tasks

- [x] Add geolocation capability to Edra editor (allows adding maps to any rich text content)

### Phase 1: Data Model Migration

- [x] Create database migration to remove direct photo-album relationship
- [x] Update schema to ensure AlbumMedia join table supports many-to-many relationships
- [x] Add album content field to store rich text/media composition
- [x] Create geo-location schema for map embedding (lat/lng, POI data)
- [x] Write data migration script to preserve existing album-photo relationships
- [x] Update all API endpoints to use new data model

### Phase 2: Photo Management Updates

- [x] Update photo permalink page to display associated albums
- [x] Create UI component for album badges/links on photo pages
- [x] Update photo API to fetch album associations
- [x] Modify admin photo editor to manage album associations
- [x] Create album selector component for photo editing

### Phase 3: Album Composer Development

- [x] Create new AlbumComposer component based on UniverseComposer
- [x] Implement rich text editor with photo insertion capabilities
- [x] Add photo browser/selector for inserting album photos
- [x] Create preview mode for composed album content
- [x] Implement auto-save functionality
- [ ] Add version history/drafts support

### Phase 4: Geo-Location Features

- [x] Design geo-card component with map embed
- [x] Integrate mapping library (e.g., Mapbox, Leaflet)
- [x] Create POI marker system with customizable popovers
- [x] Add geo-location picker in composer
- [x] Implement responsive map sizing
- [x] Add fallback for non-JS environments

### Phase 5: Frontend Updates

- [ ] Update album permalink pages to render composed content
- [ ] Remove albums from public collection views
- [ ] Update navigation/menus to reflect new album structure
- [ ] Implement new album listing page design
- [ ] Add SEO metadata for composed albums
- [ ] Update Universe feed album cards

### Phase 6: Admin Interface Updates

- [ ] Replace current AlbumForm with new composer interface
- [ ] Update album list view in admin
- [ ] Add bulk operations for album-photo associations
- [ ] Create album analytics dashboard
- [ ] Implement permission controls for album editing

## Implementation Plan

### Technical Architecture

1. **Database Structure**:

   ```prisma
   model Album {
     id            String      @id
     slug          String      @unique
     title         String
     content       Json?       // Rich content blocks
     geoLocations  GeoLocation[]
     media         AlbumMedia[]
     // ... existing fields
   }

   model Media {
     id     String       @id
     albums AlbumMedia[]
     // ... existing fields
   }

   model AlbumMedia {
     albumId      String
     mediaId      String
     displayOrder Int
     album        Album  @relation(...)
     media        Media  @relation(...)

     @@id([albumId, mediaId])
   }

   model GeoLocation {
     id        String  @id
     albumId   String
     latitude  Float
     longitude Float
     title     String
     description String?
     album     Album   @relation(...)
   }
   ```

2. **Content Block Structure**:

   ```typescript
   type ContentBlock =
   	| { type: 'text'; content: string }
   	| { type: 'photo'; mediaId: string; caption?: string }
   	| { type: 'photoGrid'; mediaIds: string[]; layout: 'masonry' | 'grid' }
   	| { type: 'geoCard'; locationId: string }
   ```

3. **API Updates**:
   - `GET /api/media/[id]/albums` - Get all albums for a photo
   - `PUT /api/albums/[id]/content` - Update album composed content
   - `POST /api/albums/[id]/locations` - Add geo-location
   - `PUT /api/media/[id]/albums` - Update photo's album associations

### Migration Strategy

1. **Phase 1**: Deploy database changes with backward compatibility
2. **Phase 2**: Update APIs to support both old and new patterns
3. **Phase 3**: Migrate frontend components incrementally
4. **Phase 4**: Run data migration to new structure
5. **Phase 5**: Remove deprecated code and fields

## Possible Challenges

### Technical Challenges

1. **Data Migration Complexity**:

   - Risk of data loss during migration from direct relationships to join table
   - Need to handle orphaned photos and maintain referential integrity
   - Performance impact during migration on large datasets

2. **Performance Considerations**:

   - Many-to-many queries could impact page load times
   - Rich content rendering may require optimization
   - Map embeds could slow down initial page loads

3. **Content Editor Complexity**:

   - Building a robust WYSIWYG editor with photo insertion
   - Handling drag-and-drop reordering of content blocks
   - Ensuring responsive preview matches final output

4. **Geo-Location Integration**:
   - Map API rate limits and costs
   - Offline/fallback handling for maps
   - Privacy concerns with location data

### User Experience Challenges

1. **Migration Path for Existing Users**:

   - Users may be confused by the new album structure
   - Need clear communication about changes
   - Potential breaking of bookmarked album URLs

2. **Content Creation Learning Curve**:

   - More complex interface compared to simple photo upload
   - Need intuitive UI for mixed content creation
   - Balancing power vs simplicity

3. **Navigation Changes**:
   - Albums no longer in collection views may confuse users
   - Need alternative discovery methods for albums
   - Maintaining SEO value of existing album pages

### Operational Challenges

1. **Storage and Bandwidth**:

   - Rich content will increase storage needs
   - Map tiles and assets increase bandwidth usage
   - Need efficient caching strategy

2. **Content Moderation**:

   - More complex content requires better moderation tools
   - Geo-location data needs privacy controls
   - Version control for composed content

3. **Backward Compatibility**:
   - API versioning to support existing integrations
   - Gradual deprecation of old endpoints
   - Supporting old album URLs with redirects

### Mitigation Strategies

1. **Phased Rollout**: Deploy features incrementally with feature flags
2. **Comprehensive Testing**: Unit, integration, and end-to-end tests for all changes
3. **Performance Monitoring**: Track query performance and optimize hot paths
4. **User Documentation**: Create guides and tutorials for new features
5. **Rollback Plan**: Maintain ability to revert to previous system if needed
