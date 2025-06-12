# PRD: SEO & Metadata System - V2

## Executive Summary

This updated PRD acknowledges the existing comprehensive SEO metadata implementation on jedmund.com and focuses on the remaining gaps: dynamic sitemap generation, OG image generation for text content, and metadata testing/validation.

## Current State Assessment

### Already Implemented ✅

- **Metadata utilities** (`/src/lib/utils/metadata.ts`) providing:
  - Complete OpenGraph and Twitter Card support
  - JSON-LD structured data generators
  - Smart title formatting and fallbacks
  - Canonical URL handling
- **100% page coverage** with appropriate metadata
- **Dynamic content support** with excerpt generation
- **Error handling** with noindex for 404 pages

### Remaining Gaps ❌

1. **No dynamic sitemap.xml**
2. **No OG image generation API** for text-based content
3. **No automated metadata validation**
4. **robots.txt doesn't reference sitemap**

## Revised Goals

1. **Complete technical SEO** with dynamic sitemap generation
2. **Enhance social sharing** with generated OG images for text content
3. **Ensure quality** with metadata validation tools
4. **Improve discoverability** with complete robots.txt

## Proposed Implementation

### Phase 1: Dynamic Sitemap (Week 1)

#### Create `/src/routes/sitemap.xml/+server.ts`

```typescript
export async function GET() {
	const pages = await getAllPublicPages()
	const xml = generateSitemapXML(pages)

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	})
}
```

Features:

- Auto-discover all public routes
- Include lastmod dates from content
- Set appropriate priorities
- Exclude admin routes

### Phase 2: OG Image Generation (Week 1-2)

#### Create `/src/routes/api/og-image/+server.ts`

```typescript
export async function GET({ url }) {
	const { title, subtitle, type } = Object.fromEntries(url.searchParams)

	const svg = generateOGImageSVG({
		title,
		subtitle,
		type, // 'post', 'project', 'default'
		brandColor: '#your-brand-color'
	})

	const png = await convertSVGtoPNG(svg)

	return new Response(png, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=31536000'
		}
	})
}
```

Templates:

- **Posts**: Title + excerpt on branded background
- **Projects**: Logo placeholder + title
- **Default**: Site logo + tagline

### Phase 3: Metadata Validation (Week 2)

#### Create `/src/lib/utils/metadata-validator.ts`

```typescript
export function validateMetaTags(page: string) {
	return {
		hasTitle: checkTitle(),
		titleLength: getTitleLength(),
		hasDescription: checkDescription(),
		descriptionLength: getDescriptionLength(),
		hasOGImage: checkOGImage(),
		hasCanonical: checkCanonical(),
		structuredDataValid: validateJSONLD()
	}
}
```

#### Add development-only validation component

- Console warnings for missing/invalid metadata
- Visual indicators in dev mode
- Automated tests for all routes

### Phase 4: Final Touches (Week 2)

1. **Update robots.txt**

```
Sitemap: https://jedmund.com/sitemap.xml

# Existing rules...
```

2. **Add metadata debugging route** (dev only)

- `/api/meta-debug` - JSON output of all pages' metadata
- Useful for testing social media previews

## Success Metrics

- [ ] Sitemap.xml validates and includes all public pages
- [ ] OG images generate for all text-based content
- [ ] All pages pass metadata validation
- [ ] Google Search Console shows improved indexing
- [ ] Social media previews display correctly

## Technical Considerations

### Performance

- Cache generated OG images (1 year)
- Cache sitemap (1 hour)
- Lazy-load validation in development only

### Maintenance

- Sitemap auto-updates with new content
- OG image templates easy to modify
- Validation runs in CI/CD pipeline

## Implementation Timeline

**Week 1:**

- Day 1-2: Implement dynamic sitemap
- Day 3-5: Create OG image generation API

**Week 2:**

- Day 1-2: Add metadata validation utilities
- Day 3-4: Testing and refinement
- Day 5: Documentation and deployment

Total: **2 weeks** (vs. original 5 weeks)

## Future Enhancements

1. **A/B testing** different OG images/titles
2. **Multi-language support** with hreflang tags
3. **Advanced schemas** (FAQ, HowTo) for specific content
4. **Analytics integration** to track metadata performance

## Appendix: Current Implementation Reference

### Existing Files

- `/src/lib/utils/metadata.ts` - Core utilities
- `/src/lib/utils/content.ts` - Content extraction
- `/src/routes/+layout.svelte` - Default metadata
- All page routes - Individual implementations

### Usage Pattern

```svelte
<script>
	import { generateMetaTags, generateArticleJsonLd } from '$lib/utils/metadata'

	$: metaTags = generateMetaTags({
		title: pageTitle,
		description: pageDescription,
		url: $page.url.href,
		type: 'article',
		image: contentImage
	})
</script>

<svelte:head>
	<title>{metaTags.title}</title>
	<!-- ... rest of meta tags ... -->
</svelte:head>
```
