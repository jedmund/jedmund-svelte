# Product Requirements Document: Apple Music Integration

## Overview

Integrate Apple Music API to enhance the music features on jedmund.com by replacing the current iTunes Search API with the full Apple Music API. This will provide higher quality artwork and 30-second preview clips immediately, while fetching and storing richer metadata for future UI enhancements. The initial implementation will maintain the current UI design with minimal changes.

## Current State

- **Last.fm Integration**: Fetches recent listening history (10 albums)
- **iTunes Search API**: Enhances album artwork (600x600 resolution)
- **Display**: Shows albums on homepage with basic metadata
- **Limitations**: Low-res artwork, no previews, limited metadata

## Goals

### Primary Goals
- **Replace iTunes Search API** with Apple Music API for better data quality
- **Add 30-second preview playback** for discovered music
- **Fetch and store enhanced metadata** (genres, release dates, track listings) for future use
- **Improve artwork quality** from 600x600 to 3000x3000 resolution

### Secondary Goals
- **Implement proper caching** using Redis (matching other API patterns)
- **Create reusable audio components** for future music features
- **Maintain current UI** while preparing data structure for future enhancements
- **Prepare foundation** for future user library integration

### Technical Goals
- Secure JWT token generation and management
- Efficient API response caching
- Clean component architecture for audio playback
- Type-safe Apple Music API integration

## Success Metrics

- Successfully replace all iTunes Search API calls
- Zero increase in page load time despite fetching more data
- Functional audio previews with smooth playback
- Higher quality artwork displayed throughout site
- Enhanced metadata properly cached and ready for future use

## Implementation Phases

### Phase 1: Foundation Setup (Week 1)

#### JWT Authentication & Configuration

- [ ] Install required dependencies (`jsonwebtoken`, `node-fetch`)
- [ ] Create `/src/lib/server/apple-music-auth.ts` for JWT generation
- [ ] Port Deno JWT code to Node.js environment
- [ ] Implement token caching mechanism (6-month expiry)
- [ ] Add environment variables to `.env.example`:
  - `APPLE_MUSIC_TEAM_ID`
  - `APPLE_MUSIC_KEY_ID`
  - `APPLE_MUSIC_PRIVATE_KEY_PATH`
- [ ] Create secure storage solution for .p8 private key file
- [ ] Add environment validation in server startup

#### Type Definitions & Interfaces

- [ ] Create `/src/lib/types/apple-music.ts` with interfaces for:
  - `AppleMusicAlbum`
  - `AppleMusicTrack`
  - `AppleMusicArtwork`
  - `AppleMusicPreview`
  - `AppleMusicSearchResponse`
- [ ] Extend existing `Album` type to include Apple Music fields
- [ ] Create type guards for API response validation
- [ ] Document all new interfaces with JSDoc comments

### Phase 2: API Integration (Week 1-2)

#### Apple Music API Client

- [ ] Create `/src/lib/server/apple-music-client.ts` with methods:
  - `searchAlbums(query: string, limit?: number)`
  - `getAlbum(id: string)`
  - `getAlbumTracks(id: string)`
  - `searchTracks(query: string, limit?: number)`
- [ ] Implement proper error handling and retry logic
- [ ] Add request rate limiting (Apple Music allows 3000/hour)
- [ ] Create response transformation utilities

#### Replace iTunes Search Integration

- [ ] Backup current `/src/routes/api/lastfm/+server.ts`
- [ ] Remove `node-itunes-search` dependency
- [ ] Update `addItunesArtToAlbums` to use Apple Music API
- [ ] Fetch full album metadata but only expose artwork and preview URLs initially
- [ ] Store enhanced metadata in response for future use
- [ ] Maintain existing response structure for UI compatibility
- [ ] Add fallback to Last.fm images if Apple Music fails
- [ ] Test with various album/artist combinations

#### Caching Layer

- [ ] Extend Redis client usage to Apple Music responses
- [ ] Implement cache keys: `apple:album:{id}`, `apple:search:{query}`
- [ ] Set TTL to 24 hours for catalog data
- [ ] Add cache warming for popular albums
- [ ] Create cache invalidation utilities
- [ ] Monitor cache hit rates

### Phase 3: Frontend Enhancement (Week 2-3)

#### Audio Preview Component

- [ ] Create `/src/lib/components/MusicPreview.svelte` with:
  - Play/pause toggle button
  - Progress bar (30-second duration)
  - Volume control
  - Loading state
  - Error handling
- [ ] Implement keyboard controls (space for play/pause)
- [ ] Add accessibility labels and ARIA attributes
- [ ] Create smooth fade in/out for previews
- [ ] Handle multiple preview instances (pause others when playing)

#### Enhanced Album Component

- [ ] Update `/src/lib/components/Album.svelte` to:
  - Use high-resolution artwork (with lazy loading)
  - Add "Preview" button (if preview URL available)
  - Keep all other UI elements unchanged
- [ ] Store enhanced metadata in component props for future use
- [ ] Implement progressive image loading (blur-up technique)
- [ ] Add error states for missing preview URLs
- [ ] Optimize preview button for mobile touch interactions

#### Homepage Integration

- [ ] Update music section data fetching
- [ ] Add preview player controls to album grid
- [ ] Implement smooth transitions between previews
- [ ] Add loading states during API calls
- [ ] Test cross-browser audio compatibility

### Phase 4: Testing & Optimization (Week 3)

#### Performance Optimization

- [ ] Implement image optimization pipeline for artwork
- [ ] Add WebP format support with fallbacks
- [ ] Lazy load audio preview components
- [ ] Minimize Apple Music API calls
- [ ] Profile and optimize render performance

#### Testing

- [ ] Unit tests for Apple Music client
- [ ] Integration tests for API endpoints
- [ ] Component tests for MusicPreview
- [ ] E2E tests for preview playback flow
- [ ] Cross-browser testing (Safari, Chrome, Firefox)
- [ ] Mobile device testing

#### Documentation

- [ ] Update README with Apple Music setup instructions
- [ ] Document all new environment variables
- [ ] Create component usage examples
- [ ] Add troubleshooting guide
- [ ] Document API rate limits and caching strategy

### Phase 5: Future Enhancements (Post-Launch)

#### User Library Integration

- [ ] Research Apple Music OAuth requirements
- [ ] Design user authentication flow
- [ ] Create library sync endpoints
- [ ] Build playlist display components
- [ ] Implement recently played tracking

#### Recommendations & Discovery

- [ ] Integrate Apple Music recommendations API
- [ ] Create "Similar Artists" component
- [ ] Build "Discover" page with curated content
- [ ] Add music taste profile generation
- [ ] Implement collaborative filtering

#### Advanced Features

- [ ] Full-length playback (with proper licensing)
- [ ] Playlist creation and management
- [ ] Social sharing of previews
- [ ] Music stats and analytics
- [ ] Apple Music embed widgets

## Technical Architecture

### API Flow
```
Last.fm API → Recent Albums → Apple Music Search → Enhanced Data → Redis Cache → Frontend
```

### Component Hierarchy
```
HomePage
  └── AlbumGrid
       └── Album
            ├── AlbumArtwork (enhanced)
            ├── AlbumMetadata (enhanced)
            └── MusicPreview (new)
```

### Data Structure
```typescript
interface EnhancedAlbum extends Album {
  appleMusicId?: string;
  highResArtwork?: string;      // Used immediately
  previewUrl?: string;           // Used immediately
  
  // Stored for future use (not displayed yet):
  genres?: string[];
  releaseDate?: string;
  trackCount?: number;
  tracks?: AppleMusicTrack[];
}
```

## Security Considerations

- Private key (.p8) must never be committed to repository
- JWT tokens should be generated server-side only
- Implement proper CORS headers for API endpoints
- Rate limit client requests to prevent abuse
- Validate all Apple Music API responses

## Dependencies

### New Dependencies
- `jsonwebtoken`: JWT generation
- `@types/jsonwebtoken`: TypeScript types

### Existing Dependencies to Leverage
- `redis`: Caching layer
- `$lib/server/redis-client`: Existing Redis connection

### Dependencies to Remove
- `node-itunes-search`: Replaced by Apple Music API

## Rollback Plan

1. Keep iTunes Search code commented but not removed initially
2. Implement feature flag for Apple Music integration
3. Monitor error rates and performance metrics
4. Have quick rollback script ready
5. Maintain data structure compatibility

## Open Questions

1. Should we display Apple Music attribution/badges?
2. Do we want to track preview play analytics?
3. Should previews auto-play on hover or require click?
4. How should we handle explicit content?
5. Do we want to implement Apple Music affiliate links?

## Success Criteria

- [ ] All iTunes Search API calls replaced successfully
- [ ] 30-second previews playing smoothly across all browsers
- [ ] Artwork quality noticeably improved
- [ ] Enhanced metadata fetched and cached (even if not displayed)
- [ ] No increase in page load time
- [ ] Current UI remains unchanged (except preview button)
- [ ] Zero security vulnerabilities
- [ ] Redis cache hit rate > 80%

## Timeline

- **Week 1**: Foundation setup and API client development
- **Week 2**: Integration and frontend components
- **Week 3**: Testing, optimization, and launch
- **Post-launch**: Monitor and iterate based on usage

## Resources

- [Apple Music API Documentation](https://developer.apple.com/documentation/applemusicapi)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Original Deno Implementation](https://gist.github.com/NetOpWibby/fca4e7942617095677831d6c74187f84)
- [MusicKit JS](https://developer.apple.com/documentation/musickitjs) (for future client-side features)