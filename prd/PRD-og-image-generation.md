# PRD: OpenGraph Image Generation System

## Executive Summary

This PRD outlines the implementation of a comprehensive OpenGraph image generation system for jedmund.com. The system will dynamically generate context-appropriate OG images for different content types while maintaining visual consistency and brand identity. The goal is to improve social media engagement and provide better visual representations of content when shared.

## Problem Statement

### Current State

- Most pages use a static default OG image
- Dynamic content (projects, essays, photos) doesn't have representative imagery when shared
- No visual differentiation between content types in social previews
- Missed opportunity for branding and engagement

### Impact

- Poor social media engagement rates
- Generic appearance when content is shared
- Lost opportunity to showcase project visuals and branding
- Inconsistent visual identity across different content types

## Goals

1. **Dynamic Generation**: Create context-appropriate OG images based on content type
2. **Visual Consistency**: Maintain brand identity while allowing for content-specific variations
3. **Performance**: Ensure fast generation with proper caching strategies
4. **Extensibility**: Build a system that can easily accommodate new content types
5. **Simplicity**: Keep the implementation DRY and maintainable

## Requirements

### Content Type Requirements

#### 1. Work Projects

- **Format**: [Avatar] + [Logo] (with "+" symbol) centered on brand background color
- **Data needed**:
  - Project logo URL (`logoUrl`)
  - Brand background color (`backgroundColor`)
  - Avatar image (use existing `src/assets/illos/jedmund.svg`)
- **Layout**: Avatar (100x100), "+" symbol, Logo (100x100) horizontally centered
- **Fallback**: If no logo, use project title on brand color
- **Font**: cstd Regular for any text

#### 2. Essays (Universe)

- **Format**: Universe icon + "Universe" label above essay title
- **Layout**: Left-aligned, vertically centered content block
- **Styling**:
  - 32px padding on all edges
  - Universe icon (24x24) + 8px gap + "Universe" label (smaller font)
  - Essay title below (larger font, max 2 lines with ellipsis)
  - Universe branding: red text (#FF0000)
  - Title: #4D4D4D
  - Background: white
  - Avatar (48x48) in bottom right corner
- **Font**: cstd Regular for all text

#### 3. Labs Projects

- **Format**: Labs icon + "Labs" label above project title
- **Layout**: Same as Essays - left-aligned, vertically centered
- **Styling**:
  - 32px padding on all edges
  - Labs icon (24x24) + 8px gap + "Labs" label (smaller font)
  - Project title below (larger font, max 2 lines with ellipsis)
  - Labs branding: red text (#FF0000)
  - Title: #4D4D4D
  - Background: white
  - Avatar (48x48) in bottom right corner
- **Font**: cstd Regular for all text

#### 4. Photos

- **Format**: The photo itself, fitted within frame
- **Styling**:
  - Photo scaled to fit within 1200x630 bounds
  - Avatar (48x48) in bottom right corner
- **Data needed**: Photo URL

#### 5. Albums

- **Format**: First photo (blurred) as background + Photos format overlay
- **Layout**: Same as Essays/Labs - left-aligned, vertically centered
- **Styling**:
  - First photo as blurred background (using CSS filter or canvas blur)
  - 32px padding on all edges
  - Photos icon (24x24) + 8px gap + "Photos" label (smaller font)
  - Album title below (larger font, max 2 lines with ellipsis)
  - All text in white
  - Avatar (48x48) in bottom right corner
- **Font**: cstd Regular for all text

#### 6. Root Pages (Homepage, Universe, Photos, Labs, About)

- **No change**: Continue using existing static OG image

### Technical Requirements

1. **Caching**: Generated images must be cached indefinitely
2. **Performance**: Generation should be fast (<500ms)
3. **Quality**: Images must be high quality (1200x630px)
4. **Reliability**: Graceful fallbacks for missing data
5. **Security**: Prevent abuse through rate limiting

## Proposed Solution

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Page Route    │────▶│  Metadata Utils  │────▶│  OG Image URL   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ /api/og-image/   │
                        │   +server.ts     │
                        └──────────────────┘
                                 │
                        ┌────────┴────────┐
                        ▼                 ▼
                  ┌──────────┐     ┌──────────────┐
                  │ Generate │     │ Return Cache │
                  │   SVG    │     │              │
                  └──────────┘     └──────────────┘
                        │
                        ▼
                  ┌──────────┐
                  │ Convert  │────────┐
                  │ to PNG   │        │
                  └──────────┘        ▼
                        │        For Albums:
                        │        Apply blur
                        ▼        effect
                  ┌──────────┐
                  │ Upload to│
                  │Cloudinary│
                  └──────────┘
                        │
                        ▼
                  ┌──────────┐
                  │  Store   │
                  │ in Redis │
                  └──────────┘
```

### Implementation Details

#### 1. API Endpoint Structure

```typescript
/api/og-image?type=work&title=Project&logo=url&bg=color
/api/og-image?type=essay&title=Essay+Title
/api/og-image?type=labs&title=Lab+Project
/api/og-image?type=photo&url=photo-url
/api/og-image?type=album&title=Album&bg=photo-url
```

#### 2. Hybrid Template System

- SVG templates for text-based layouts (work, essays, labs, photos)
- Canvas/Sharp for blur effects (albums)
- Use template literals for dynamic content injection
- Embed base64-encoded assets (icons, avatar) to avoid external dependencies
- All text rendered in cstd Regular font

#### 3. Asset Management

- Avatar: Use existing SVG at src/assets/illos/jedmund.svg, convert to base64
- Icons: Convert Universe, Labs, Photos icons to base64
- Fonts: Embed cstd Regular font for consistent rendering
- The "+" symbol in work projects must be rendered as part of the layout

#### 4. Caching Strategy (Cloudinary-based)

##### Multi-Level Caching Architecture

**Level 1: Cloudinary CDN (Permanent Storage)**

- Upload generated images to `jedmund/og-images/` folder
- Use content-based public IDs: `og-{type}-{contentHash}`
- Leverage Cloudinary's global CDN for distribution
- Automatic format optimization and responsive delivery

**Level 2: Redis Cache (Fast Lookups)**

- Cache mapping: content ID → Cloudinary public ID
- TTL: 24 hours for quick access
- Key structure: `og:{type}:{id}:{version}` → `cloudinary_public_id`

**Level 3: Browser Cache (Client-side)**

- Set long cache headers on Cloudinary URLs
- Immutable URLs with content-based versioning

##### Content-Based Versioning

```typescript
function generateOgImageId(type: string, data: any): string {
	const content = {
		type,
		// Include only content that affects the image
		...(type === 'work' && { title: data.title, logo: data.logoUrl, bg: data.backgroundColor }),
		...(type === 'essay' && { title: data.title }),
		...(type === 'labs' && { title: data.title }),
		...(type === 'photo' && { url: data.url }),
		...(type === 'album' && { title: data.title, firstPhoto: data.photos[0].src })
	}

	const hash = createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 8)
	return `og-${type}-${hash}`
}
```

##### Caching Flow

1. **Check Redis** for existing Cloudinary URL
2. **If found**, return Cloudinary URL immediately
3. **If not found**:
   - Generate SVG/PNG image
   - Upload to Cloudinary with content-based public ID
   - Store Cloudinary URL in Redis
   - Return Cloudinary URL

##### Invalidation Strategy

- **Automatic**: Content changes = new hash = new public ID
- **Manual**: Admin UI to force regeneration (stretch goal)
- **No cleanup needed**: Cloudinary handles storage

### Code Organization

```
src/
├── routes/
│   └── api/
│       └── og-image/
│           └── +server.ts         # Main endpoint
├── lib/
│   └── og-image/
│       ├── templates/
│       │   ├── work.ts           # Work project template
│       │   ├── essay.ts          # Essay template
│       │   ├── labs.ts           # Labs template
│       │   ├── photo.ts          # Photo template
│       │   └── album.ts          # Album template
│       ├── assets/
│       │   ├── avatar.ts         # Base64 avatar
│       │   └── icons.ts          # Base64 icons
│       ├── generator.ts          # Core generation logic
│       └── cloudinary.ts         # Cloudinary upload logic
```

## Implementation Plan

### Phase 1: Foundation (Day 1)

- [ ] Install dependencies (sharp for image processing)
- [ ] Create API endpoint structure
- [ ] Set up Cloudinary integration for og-images folder
- [ ] Implement Redis caching layer
- [ ] Implement basic SVG to PNG conversion

### Phase 2: Asset Preparation (Day 2)

- [ ] Load Avatar SVG from src/assets/illos/jedmund.svg
- [ ] Convert Avatar SVG to base64 for embedding
- [ ] Convert Universe, Labs, Photos icons to base64
- [ ] Embed cstd Regular font as base64
- [ ] Create asset management module
- [ ] Test asset embedding in SVGs

### Phase 3: Template Development (Days 3-4)

- [ ] Create Work project template
- [ ] Create Essay/Universe template
- [ ] Create Labs template (reuse Essay structure)
- [ ] Create Photo template
- [ ] Create Album template

### Phase 4: Integration (Day 5)

- [ ] Update metadata utils to generate OG image URLs
- [ ] Implement Cloudinary upload pipeline
- [ ] Set up Redis caching for Cloudinary URLs
- [ ] Update all relevant pages to use dynamic OG images
- [ ] Add fallback handling
- [ ] Test all content types

### Phase 5: Optimization (Day 6)

- [ ] Performance testing
- [ ] Add rate limiting
- [ ] Optimize SVG generation
- [ ] Add monitoring/logging

## Potential Pitfalls & Mitigations

### 1. Performance Issues

**Risk**: SVG to PNG conversion could be slow, especially with blur effects
**Mitigation**:

- Pre-generate common images
- Use efficient SVG structures for text-based layouts
- Use Sharp's built-in blur capabilities for album backgrounds
- Implement request coalescing

### 2. Memory Usage

**Risk**: Image processing could consume significant memory
**Mitigation**:

- Stream processing where possible
- Implement memory limits
- Use worker threads if needed

### 3. Font Rendering

**Risk**: cstd Regular font may not render consistently
**Mitigation**:

- Embed cstd Regular font as base64 in SVG
- Use font subsetting to reduce size
- Test rendering across different platforms
- Fallback to similar web-safe fonts if needed

### 4. Asset Loading

**Risk**: External assets could fail to load
**Mitigation**:

- Embed all assets as base64
- No external dependencies
- Graceful fallbacks

### 5. Cache Invalidation

**Risk**: Updated content shows old OG images
**Mitigation**:

- Include version/timestamp in URL params
- Use content-based cache keys
- Provide manual cache purge option

## Success Metrics

1. **Generation Time**: <500ms for 95% of requests
2. **Cache Hit Rate**: >90% after 24 hours
3. **Error Rate**: <0.1% of requests
4. **Visual Quality**: All text readable, proper contrast
5. **Social Engagement**: Increased click-through rates on shared links

## Future Enhancements

1. **A/B Testing**: Test different layouts/styles
2. **Internationalization**: Support for multiple languages
3. **Dynamic Backgrounds**: Gradient or pattern options
4. **Animation**: Animated OG images for supported platforms
5. **Analytics**: Track which images drive most engagement

## Stretch Goals

### Admin UI for OG Image Management

1. **OG Image Viewer**

   - Display current OG image for each content type
   - Show Cloudinary URL and metadata
   - Preview how it appears on social platforms

2. **Manual Regeneration**

   - "Regenerate OG Image" button per content item
   - Preview new image before confirming
   - Bulk regeneration tools for content types

3. **Analytics Dashboard**

   - Track generation frequency
   - Monitor cache hit rates
   - Show most viewed OG images

4. **Template Editor** (Advanced)
   - Visual editor for OG image templates
   - Live preview with sample data
   - Save custom templates per content type

## Task Checklist

### High Priority

- [ ] Set up API endpoint with proper routing
- [ ] Install sharp and @resvg/resvg-js for image processing
- [ ] Configure Cloudinary og-images folder
- [ ] Implement Redis caching for Cloudinary URLs
- [ ] Create hybrid template system (SVG + Canvas)
- [ ] Load and convert Avatar SVG to base64
- [ ] Convert icons to base64 format
- [ ] Embed cstd Regular font
- [ ] Implement Work project template (with "+" symbol)
- [ ] Implement Essay/Universe template
- [ ] Implement Labs template (same layout as Essays)
- [ ] Implement Photo template
- [ ] Implement Album template with blur effect
- [ ] Implement Cloudinary upload pipeline
- [ ] Update metadata utils to generate URLs
- [ ] Test end-to-end caching flow

### Medium Priority

- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Create fallback templates
- [ ] Performance optimization

### Low Priority

- [ ] Add monitoring dashboard
- [ ] Create manual regeneration endpoint
- [ ] Add A/B testing capability
- [ ] Documentation

### Stretch Goals

- [ ] Admin UI: OG image viewer
- [ ] Admin UI: Manual regeneration button
- [ ] Admin UI: Bulk regeneration tools
- [ ] Admin UI: Preview before regeneration
- [ ] Analytics dashboard for OG images
- [ ] Template editor (advanced)

## Dependencies

### Required Packages

- `sharp`: For SVG to PNG conversion and blur effects
- `@resvg/resvg-js`: Alternative high-quality SVG to PNG converter
- `cloudinary`: Already installed, for image storage and CDN
- `ioredis`: Already installed, for caching Cloudinary URLs
- Built-in Node.js modules for base64 encoding

### External Assets Needed

- Avatar SVG (existing at src/assets/illos/jedmund.svg)
- Universe icon SVG
- Labs icon SVG
- Photos icon SVG
- cstd Regular font file

### API Requirements

- Access to project data (logo, colors)
- Access to photo URLs
- Access to content titles and descriptions

### Infrastructure Requirements

- Cloudinary account with og-images folder configured
- Redis instance for caching (already available)
- Railway deployment (no local disk storage)
