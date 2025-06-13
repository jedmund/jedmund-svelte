# PRD: Dominant Color Extraction for Uploaded Images

## Overview

This PRD outlines the implementation of automatic dominant color extraction for images uploaded to the media library. This feature will analyze uploaded images to extract their primary colors, enabling color-based organization, search, and visual enhancements throughout the application.

## Goals

1. **Automatic Color Analysis**: Extract dominant colors from images during the upload process
2. **Data Storage**: Store color information efficiently alongside existing image metadata
3. **Visual Enhancement**: Use extracted colors to enhance UI/UX in galleries and image displays
4. **Performance**: Ensure color extraction doesn't significantly impact upload performance

## Technical Approach

### Color Extraction Library Options

1. **node-vibrant** (Recommended)

   - Pros: Lightweight, fast, good algorithm, actively maintained
   - Cons: Node.js only (server-side processing)
   - NPM: `node-vibrant`

2. **color-thief-node**

   - Pros: Simple API, battle-tested algorithm
   - Cons: Less feature-rich than vibrant
   - NPM: `colorthief`

3. **Cloudinary Color Analysis**
   - Pros: Integrated with existing upload pipeline, no extra processing
   - Cons: Requires paid plan, vendor lock-in
   - API: `colors` parameter in upload response

### Recommended Approach: node-vibrant

```javascript
import Vibrant from 'node-vibrant'

// Extract colors from uploaded image
const palette = await Vibrant.from(buffer).getPalette()
const dominantColors = {
	vibrant: palette.Vibrant?.hex,
	darkVibrant: palette.DarkVibrant?.hex,
	lightVibrant: palette.LightVibrant?.hex,
	muted: palette.Muted?.hex,
	darkMuted: palette.DarkMuted?.hex,
	lightMuted: palette.LightMuted?.hex
}
```

## Database Schema Changes

### Option 1: Add to Existing exifData JSON (Recommended)

```prisma
model Media {
  // ... existing fields
  exifData  Json?  // Add color data here: { colors: { vibrant, muted, etc }, ...existingExif }
}
```

### Option 2: Separate Colors Field

```prisma
model Media {
  // ... existing fields
  dominantColors  Json?  // { vibrant, darkVibrant, lightVibrant, muted, darkMuted, lightMuted }
}
```

## API Changes

### Upload Endpoint (`/api/media/upload`)

Update the upload handler to extract colors:

```typescript
// After successful upload to Cloudinary
if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
	const buffer = await file.arrayBuffer()

	// Extract EXIF data (existing)
	const exifData = await extractExifData(file)

	// Extract dominant colors (new)
	const colorData = await extractDominantColors(buffer)

	// Combine data
	const metadata = {
		...exifData,
		colors: colorData
	}
}
```

### Response Format

```json
{
	"id": 123,
	"url": "...",
	"dominantColors": {
		"vibrant": "#4285f4",
		"darkVibrant": "#1a73e8",
		"lightVibrant": "#8ab4f8",
		"muted": "#5f6368",
		"darkMuted": "#3c4043",
		"lightMuted": "#e8eaed"
	}
}
```

## UI/UX Considerations

### 1. Media Library Display

- Show color swatches on hover/focus
- Optional: Color-based filtering or sorting

### 2. Gallery Image Modal

- Display color palette in metadata section
- Show hex values for each color
- Copy-to-clipboard functionality for colors

### 3. Album/Gallery Views

- Use dominant color for background accents
- Create dynamic gradients from extracted colors
- Enhance loading states with color placeholders

### 4. Potential Future Features

- Color-based search ("find blue images")
- Automatic theme generation for albums
- Color harmony analysis for galleries

## Implementation Plan

### Phase 1: Backend Implementation (1 day)

1. Install and configure node-vibrant
2. Create color extraction utility function
3. Integrate into upload pipeline
4. Update database schema (migration)
5. Update API responses

### Phase 2: Basic Frontend Display (0.5 day)

1. Update Media type definitions
2. Display colors in GalleryImageModal
3. Add color swatches to media details

### Phase 3: Enhanced UI Features (1 day)

1. Implement color-based backgrounds
2. Add loading placeholders with colors
3. Create color palette component

### Phase 4: Testing & Optimization (0.5 day)

1. Test with various image types
2. Optimize for performance
3. Handle edge cases (B&W images, etc.)

## Success Metrics

1. **Performance**: Color extraction adds < 200ms to upload time
2. **Accuracy**: Colors accurately represent image content
3. **Coverage**: 95%+ of uploaded images have color data
4. **User Experience**: Improved visual coherence in galleries

## Edge Cases & Considerations

1. **Black & White Images**: Should return grayscale values
2. **Transparent PNGs**: Handle alpha channel appropriately
3. **Very Large Images**: Consider downsampling for performance
4. **Failed Extraction**: Gracefully handle errors without blocking upload

## Future Enhancements

1. **Color Search**: Search images by dominant color
2. **Auto-Tagging**: Suggest tags based on color analysis
3. **Accessibility**: Use colors to improve contrast warnings
4. **Analytics**: Track most common colors in library
5. **Batch Processing**: Extract colors for existing images

## Dependencies

- `node-vibrant`: ^3.2.1
- No additional infrastructure required
- Compatible with existing Cloudinary workflow

## Timeline

- Total effort: 2-3 days
- Can be implemented incrementally
- No breaking changes to existing functionality
