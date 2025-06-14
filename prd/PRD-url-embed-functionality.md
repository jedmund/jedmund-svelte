# Product Requirements Document: URL Embed Functionality

## Overview

This PRD outlines the implementation of URL paste functionality in the Editor that allows users to choose between displaying URLs as rich embed cards or simple links.

## Background

Currently, the Editor supports various content types including text, images, and code blocks. Adding URL embed functionality will enhance the content creation experience by allowing users to share links with rich previews that include titles, descriptions, and images from the linked content.

## Goals

1. Enable users to paste URLs and automatically convert them to rich embed cards
2. Provide flexibility to display URLs as either embed cards or simple links
3. Maintain consistency with existing UI/UX patterns
4. Ensure performance with proper loading states and error handling

## User Stories

1. **As a content creator**, I want to paste a URL and have it automatically display as a rich preview card so that my content is more engaging.
2. **As a content creator**, I want to be able to choose between an embed card and a simple link so that I have control over how my content appears.
3. **As a content creator**, I want to edit or remove URL embeds after adding them so that I can correct mistakes or update content.
4. **As a reader**, I want to see rich previews of linked content so that I can decide whether to click through.

## Functional Requirements

### URL Detection and Conversion

1. **Automatic Detection**: When a user pastes a plain URL (e.g., `https://example.com`), the system should:
   - Create a regular text link initially
   - Display a dropdown menu next to the cursor with the option to "Convert to embed"
   - If the user selects "Convert to embed", replace the link with an embed placeholder and fetch metadata
   - If the user dismisses the dropdown or continues typing, keep it as a regular link
2. **Manual Entry**: Users should be able to manually add URL embeds through:
   - Toolbar button (Insert → Link)
   - Slash command (/url-embed)
   - Direct input in placeholder

### Embed Card Display

1. **Metadata Fetching**: The system should fetch OpenGraph metadata including:
   - Title
   - Description
   - Preview image
   - Site name
   - Favicon
2. **Card Layout**: Display fetched metadata in a visually appealing card format that includes:
   - Preview image (if available)
   - Title (linked to URL)
   - Description (truncated if too long)
   - Site name and favicon
3. **Fallback**: If metadata fetching fails, display a simple card with the URL

### User Interactions

1. **In-Editor Actions**:
   - Refresh metadata
   - Open link in new tab
   - Remove embed
   - Convert between embed and link
2. **Loading States**: Show spinner while fetching metadata
3. **Error Handling**: Display user-friendly error messages

### Content Rendering

1. **Editor View**: Full interactive embed with action buttons
2. **Published View**: Static card with clickable elements
3. **Responsive Design**: Cards should adapt to different screen sizes

## Technical Implementation

### Architecture

1. **TipTap Extensions**:

   - `UrlEmbed`: Main node extension for URL detection and schema
   - `UrlEmbedPlaceholder`: Temporary node during loading
   - `UrlEmbedExtended`: Final node with metadata

2. **Components**:

   - `UrlEmbedPlaceholder.svelte`: Loading/input UI
   - `UrlEmbedExtended.svelte`: Rich preview card

3. **API Integration**:
   - Utilize existing `/api/og-metadata` endpoint
   - Implement caching to reduce redundant fetches

### Data Model

```typescript
interface UrlEmbedNode {
	type: 'urlEmbed'
	attrs: {
		url: string
		title?: string
		description?: string
		image?: string
		siteName?: string
		favicon?: string
	}
}
```

## UI/UX Specifications

### Visual Design

- Match existing `LinkCard` component styling
- Use established color variables and spacing
- Maintain consistency with overall site design

### Interaction Patterns

1. **Paste Flow**:

   - User pastes URL
   - URL appears as regular link text
   - Dropdown menu appears next to cursor with "Convert to embed" option
   - If user selects "Convert to embed":
     - Link is replaced with placeholder showing spinner
     - Metadata loads and card renders
     - User can interact with card
   - If user dismisses dropdown:
     - URL remains as regular link

2. **Manual Entry Flow**:
   - User clicks Insert → Link or types /url-embed
   - Input field appears
   - User enters URL and presses Enter
   - Same loading/rendering flow as paste

## Performance Considerations

1. **Lazy Loading**: Only fetch metadata when URL is added
2. **Caching**: Cache fetched metadata to avoid redundant API calls
3. **Timeout**: Implement reasonable timeout for metadata fetching
4. **Image Optimization**: Consider lazy loading preview images

## Security Considerations

1. **URL Validation**: Validate URLs before fetching metadata
2. **Content Sanitization**: Sanitize fetched metadata to prevent XSS
3. **CORS Handling**: Properly handle cross-origin requests

## Success Metrics

1. **Adoption Rate**: Percentage of posts using URL embeds
2. **Error Rate**: Frequency of metadata fetch failures
3. **Performance**: Average time to fetch and display metadata
4. **User Satisfaction**: Feedback on embed functionality

## Future Enhancements

1. **Custom Previews**: Allow manual editing of metadata
2. **Platform-Specific Embeds**: Special handling for YouTube, Twitter, etc.
3. **Embed Templates**: Different card styles for different content types

## Timeline

### Phase 1: Core Functionality

**Status**: In Progress

#### Completed Tasks:

- [x] Create TipTap extension for URL detection (`UrlEmbed.ts`)
- [x] Create placeholder component for loading state (`UrlEmbedPlaceholder.svelte`)
- [x] Create extended component for rich preview (`UrlEmbedExtended.svelte`)
- [x] Integrate with existing `/api/og-metadata` endpoint
- [x] Add URL embed to Insert menu in toolbar
- [x] Add URL embed to slash commands
- [x] Implement loading states and error handling
- [x] Style embed cards to match existing LinkCard design
- [x] Add content rendering for published posts

#### Remaining Tasks:

- [x] Implement paste detection with dropdown menu
- [x] Create dropdown component for "Convert to embed" option
- [x] Add convert between embed/link functionality
- [x] Add keyboard shortcuts for dropdown interaction
- [x] Implement caching for metadata fetches
- [ ] Add tests for URL detection and conversion
- [ ] Update documentation

### Phase 2: Platform-Specific Embeds

**Status**: Future

- [ ] YouTube video embeds with player
- [ ] Twitter/X post embeds
- [ ] Instagram post embeds
- [ ] GitHub repository/gist embeds

### Phase 3: Advanced Customization

**Status**: Future

- [ ] Custom preview editing
- [ ] Multiple embed templates/styles
- [ ] Embed size options (compact/full)
- [ ] Custom CSS for embeds

## Dependencies

- Existing `/api/og-metadata` endpoint
- TipTap editor framework
- Svelte 5 with runes mode
- Existing design system and CSS variables
