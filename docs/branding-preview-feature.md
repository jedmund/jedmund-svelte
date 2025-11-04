# Project Branding Preview Enhancement

## Overview
Add a live, reactive preview unit to the Branding tab showing how the project header will appear on the public site, with visibility toggles for individual branding elements.

---

## Phase 1: Database & Type Updates

### 1.1 Database Schema Changes
**File**: Prisma schema
- Add new optional boolean fields to Project model:
  - `showFeaturedImageInHeader` (default: true)
  - `showBackgroundColorInHeader` (default: true)
  - `showLogoInHeader` (default: true)

### 1.2 Type Definition Updates
**File**: `/src/lib/types/project.ts`
- Add new fields to `Project` interface
- Add new fields to `ProjectFormData` interface
- Update `defaultProjectFormData` with default values (all true)

---

## Phase 2: Create Preview Component

### 2.1 New Component: ProjectBrandingPreview.svelte
**Location**: `/src/lib/components/admin/ProjectBrandingPreview.svelte`

**Features**:
- Full-width container (respects parent padding)
- 300px height (matches public project header)
- Responsive height (250px on tablet, 200px on mobile)
- Display priority: featuredImage > backgroundColor > fallback gray (#f5f5f5)
- Logo centered vertically and horizontally (85px x 85px)
- Fallback placeholder logo when no logo provided
- Reactive to all formData changes (featuredImage, backgroundColor, logoUrl)
- Conditional rendering based on visibility toggles
- Corner radius matching public site ($card-corner-radius)
- Subtle mouse-tracking animation on logo (optional, matches public site)

**Props**:
```typescript
interface Props {
  featuredImage: string | null
  backgroundColor: string
  logoUrl: string
  showFeaturedImage: boolean
  showBackgroundColor: boolean
  showLogo: boolean
}
```

### 2.2 Visual States to Handle:
1. **No data**: Gray background + placeholder icon
2. **Logo only**: Show logo on fallback background
3. **Color only**: Show color background without logo
4. **Featured image only**: Show image without logo
5. **All elements**: Featured image (or color) + logo
6. **Featured image + color**: Featured image takes priority, color ignored
7. **Visibility toggles**: Respect all toggle states

---

## Phase 3: Update ProjectBrandingForm

### 3.1 Form Restructure
**File**: `/src/lib/components/admin/ProjectBrandingForm.svelte`

**New Layout Order**:
1. **Preview Section** (top, unlabeled)
   - ProjectBrandingPreview component
   - Bound to all reactive form data

2. **Background Section**
   - Featured Image uploader (keep existing)
   - Background Color picker (keep existing)
   - Toggle: "Show featured image in header"
   - Toggle: "Show background color in header" (only visible if no featured image, or featured image toggle is off)
   - Help text: "Featured image takes priority over background color"

3. **Logo Section**
   - Logo uploader (keep existing)
   - Toggle: "Show logo in header"
   - Help text: "Upload an SVG logo that appears centered over the header background"

4. **Colors Section**
   - Highlight Color picker (keep existing)

### 3.2 Toggle Component Pattern
Use existing toggle pattern from AlbumForm.svelte:
```svelte
<label class="toggle-label">
  <input type="checkbox" bind:checked={formData.showLogoInHeader} class="toggle-input" />
  <div class="toggle-content">
    <span class="toggle-title">Show logo in header</span>
    <span class="toggle-description">Display the project logo centered over the header</span>
  </div>
  <span class="toggle-slider"></span>
</label>
```

### 3.3 Bind FormData Fields
- Add bindings for new toggle fields
- Ensure auto-save triggers on toggle changes

---

## Phase 4: Additional Enhancements (Suggestions)

### 4.1 Preview Mode Selector
Add segmented control to preview component header:
- **Header View** (default): 300px tall, logo centered
- **Card View**: 80px tall, matches ProjectItem card style
- Shows how branding appears in different contexts

### 4.2 Background Priority Explanation
Add info callout:
- "When both featured image and background color are provided, the featured image will be used in the header"
- Consider adding radio buttons for explicit priority selection

### 4.3 Logo Adjustments
Add additional controls (future enhancement):
- Logo size slider (small/medium/large)
- Logo position selector (center/top-left/top-right/bottom-center)
- Logo background blur/darken overlay toggle (for better logo visibility)

### 4.4 Smart Defaults
- Auto-enable toggles when user uploads/adds content
- Auto-disable toggles when user removes content
- Show warning if logo would be invisible (e.g., white logo on white background)

### 4.5 Accessibility Improvements
- Add alt text field for featured image in preview
- Logo contrast checker against background
- ARIA labels for preview container

### 4.6 Layout Improvements
Add section dividers with subtle borders between:
- Preview (unlabeled, visual-only)
- Background settings
- Logo settings
- Color settings

---

## Implementation Checklist

### Database & Types
- [ ] Add schema fields: `showFeaturedImageInHeader`, `showBackgroundColorInHeader`, `showLogoInHeader`
- [ ] Run migration
- [ ] Update Project type interface
- [ ] Update ProjectFormData type interface
- [ ] Update defaultProjectFormData with defaults

### Components
- [ ] Create ProjectBrandingPreview.svelte component
- [ ] Add preview rendering logic (image vs color priority)
- [ ] Add fallback states (no data, partial data)
- [ ] Style preview to match public header dimensions
- [ ] Add reactive binding to all branding props

### Form Updates
- [ ] Import ProjectBrandingPreview into ProjectBrandingForm
- [ ] Add preview at top of form (full-width, unlabeled)
- [ ] Add toggle for "Show featured image in header"
- [ ] Add toggle for "Show background color in header"
- [ ] Add toggle for "Show logo in header"
- [ ] Bind toggles to formData
- [ ] Add helpful descriptions to each toggle
- [ ] Copy toggle styles from AlbumForm
- [ ] Test auto-save with toggle changes

### Public Site Updates
- [ ] Update project detail page to respect visibility toggles
- [ ] Update ProjectItem cards to respect visibility toggles (if applicable)
- [ ] Ensure backward compatibility (default to showing all elements)

### Testing
- [ ] Test all preview states (no data, partial data, full data)
- [ ] Test toggle interactions
- [ ] Test auto-save with changes
- [ ] Test on different viewport sizes
- [ ] Test with real project data

---

## Technical Notes

- **Reactivity**: Use Svelte 5 runes ($derived, $state) for reactive preview
- **Performance**: Preview should update without lag during typing/color picking
- **Autosave**: All toggle changes should trigger autosave
- **Validation**: Consider warning if header would be blank (all toggles off)
- **Migration**: Existing projects should default all visibility toggles to `true`
