# PRD: SEO & Metadata System

## Executive Summary

This PRD outlines the implementation of a comprehensive SEO and metadata system for jedmund.com. Currently, many pages lack proper browser titles, OpenGraph tags, and Twitter cards, which impacts search engine visibility and social media sharing. This upgrade will create a systematic approach to metadata management across all pages.

## Problem Statement

### Current Issues

1. **Inconsistent Implementation**: Only 2 out of 10+ page types have proper metadata
2. **Missing Social Media Support**: No Twitter cards on any pages
3. **Poor Search Visibility**: Missing canonical URLs, structured data, and sitemaps
4. **Hardcoded Values**: Base meta tags in app.html cannot be dynamically updated
5. **No Image Strategy**: Most pages lack OpenGraph images, reducing social media engagement

### Impact

- Reduced search engine visibility
- Poor social media sharing experience
- Missed opportunities for rich snippets in search results
- Inconsistent branding across shared links

## Goals

1. **Implement comprehensive metadata** on all pages
2. **Create reusable components** for consistent implementation
3. **Support dynamic content** with appropriate fallbacks
4. **Enhance social sharing** with proper images and descriptions
5. **Improve SEO** with structured data and technical optimizations

## Success Metrics

- 100% of pages have appropriate title tags
- All shareable pages have OpenGraph and Twitter card support
- Dynamic pages pull metadata from their content
- Consistent branding across all metadata
- Valid structured data on relevant pages

## Proposed Solution

### 1. Core Components

#### SeoMetadata Component

A centralized Svelte component that handles all metadata needs:

```svelte
<SeoMetadata
	title="Project Title"
	description="Project description"
	type="article"
	image="/path/to/image.jpg"
	author="@jedmund"
	publishedTime={date}
	modifiedTime={date}
	tags={['tag1', 'tag2']}
/>
```

Features:

- Automatic title formatting (e.g., "Title | @jedmund")
- Fallback chains for missing data
- Support for all OpenGraph types
- Twitter card generation
- Canonical URL handling
- JSON-LD structured data

### 2. Page-Specific Implementation

#### High Priority Pages

**Home Page (/)**

- Title: "@jedmund — Software designer and strategist"
- Description: Professional summary
- Type: website
- Image: Professional headshot or branded image

**Work Project Pages (/work/[slug])**

- Title: "[Project Name] by @jedmund"
- Description: Project description
- Type: article
- Image: Project logo on brand color background
- Structured data: CreativeWork schema

**Photo Pages (/photos/[slug]/[id])**

- Title: "[Photo Title] | Photography by @jedmund"
- Description: Photo caption or album context
- Type: article
- Image: The photo itself
- Structured data: ImageObject schema

**Universe Posts (/universe/[slug])**

- Essays (long-form): "[Essay Name] — @jedmund"
- Posts (short-form): "@jedmund: [Post snippet]"
- Description: Post excerpt (first 160 chars)
- Type: article
- Image: First attachment or fallback
- Structured data: BlogPosting schema

#### Medium Priority Pages

**Labs Projects (/labs/[slug])**

- Similar to Work projects but with "Lab" designation
- Experimental project metadata

**About Page (/about)**

- Title: "About | @jedmund"
- Description: Professional bio excerpt
- Type: profile
- Structured data: Person schema

**Photo Albums (/photos/[slug])**

- Title: "[Album Name] | Photography by @jedmund"
- Description: Album description
- Type: website
- Image: Album cover or first photo

### 3. Dynamic OG Image Generation

Create an API endpoint (`/api/og-image`) that generates images:

- For projects: Logo on brand color background
- For photos: The photo itself with optional watermark
- For text posts: Branded template with title
- Fallback: Site-wide branded image

### 4. Technical SEO Improvements

**Sitemap Generation**

- Dynamic sitemap.xml generation
- Include all public pages
- Update frequency and priority hints

**Robots.txt**

- Allow all crawlers by default
- Block admin routes
- Reference sitemap location

**Canonical URLs**

- Automatic canonical URL generation
- Handle www/non-www consistency
- Support pagination parameters

### 5. Utilities & Helpers

**formatSeoTitle(title, suffix = "@jedmund")**

- Consistent title formatting
- Character limit enforcement (60 chars)

**generateDescription(content, limit = 160)**

- Extract description from content
- HTML stripping
- Smart truncation

**getCanonicalUrl(path)**

- Generate absolute URLs
- Handle query parameters
- Ensure consistency

## Implementation Plan

### Phase 1: Foundation (Week 1)

- [ ] Create SeoMetadata component
- [ ] Implement basic meta tag support
- [ ] Add title/description utilities
- [ ] Update app.html to remove hardcoded values

### Phase 2: Critical Pages (Week 2)

- [ ] Home page metadata
- [ ] Work project pages
- [ ] Universe post pages
- [ ] Photo detail pages

### Phase 3: Secondary Pages (Week 3)

- [ ] About page
- [ ] Labs page and projects
- [ ] Photo albums and index
- [ ] Universe feed

### Phase 4: Advanced Features (Week 4)

- [ ] Dynamic OG image generation
- [ ] Structured data implementation
- [ ] Sitemap generation
- [ ] Technical SEO improvements

### Phase 5: Testing & Refinement (Week 5)

- [ ] Test all pages with social media debuggers
- [ ] Validate structured data
- [ ] Performance optimization
- [ ] Documentation

## Technical Considerations

### Performance

- Metadata generation should not impact page load time
- Cache generated OG images
- Minimize JavaScript overhead

### Maintenance

- Centralized component reduces update complexity
- Clear documentation for adding new pages
- Automated testing for metadata presence

### Compatibility

- Support major social platforms (Twitter, Facebook, LinkedIn)
- Ensure search engine compatibility
- Fallback for missing data

## Risks & Mitigation

**Risk**: Dynamic image generation could be slow
**Mitigation**: Implement caching and pre-generation for known content

**Risk**: Incorrect metadata could hurt SEO
**Mitigation**: Thorough testing and validation tools

**Risk**: Increased complexity for developers
**Mitigation**: Clear component API and documentation

## Future Enhancements

1. **A/B Testing**: Test different titles/descriptions for engagement
2. **Analytics Integration**: Track which metadata drives traffic
3. **Internationalization**: Support for multiple languages
4. **Rich Snippets**: Implement more schema types (FAQ, HowTo, etc.)
5. **Social Media Automation**: Auto-generate platform-specific variants

## Appendix

### Current Implementation Status

✅ **Good Implementation**

- /universe/[slug]
- /photos/[albumSlug]/[photoId]

⚠️ **Partial Implementation**

- /photos/[slug]
- /universe

❌ **No Implementation**

- / (home)
- /about
- /labs
- /labs/[slug]
- /photos
- /work/[slug]

### Resources

- [OpenGraph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards)
- [Schema.org](https://schema.org/)
- [Google SEO Guidelines](https://developers.google.com/search/docs)
