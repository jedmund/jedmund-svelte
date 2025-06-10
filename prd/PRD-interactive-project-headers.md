# PRD: Interactive Project Headers

## Overview
Implement a system for project-specific interactive headers that can be selected per project through the admin UI. Each project can have a unique, animated header component or use a generic default.

## Goals
- Create engaging, project-specific header experiences
- Maintain simplicity in implementation and admin UI
- Allow for creative freedom while keeping the system maintainable
- Provide a path for adding new header types over time

## Implementation Strategy
We will use a component-based system where each project can select from a predefined list of header components. Each header component is a fully custom Svelte component that receives the project data as props.

## Technical Implementation

### 1. Database Schema Update
Add a `headerType` field to the Project model in `prisma/schema.prisma`:

```prisma
model Project {
  // ... existing fields
  headerType String @default("logoOnBackground") // 'none', 'logoOnBackground', 'pinterest', 'maitsu', etc.
}
```

### 2. Component Structure
Create a new directory structure for header components:

```
src/lib/components/headers/
├── ProjectHeader.svelte           # Main switcher component
├── LogoOnBackgroundHeader.svelte  # Generic header (current behavior)
├── PinterestHeader.svelte         # Custom Pinterest project header
├── MaitsuHeader.svelte            # Custom Maitsu project header
└── index.ts                       # Export all headers
```

### 3. ProjectHeader Component (Switcher)
The main component that switches between different header types:

```svelte
<!-- ProjectHeader.svelte -->
<script>
  import LogoOnBackgroundHeader from './LogoOnBackgroundHeader.svelte';
  import PinterestHeader from './PinterestHeader.svelte';
  import MaitsuHeader from './MaitsuHeader.svelte';
  
  let { project } = $props();
  
  const headers = {
    logoOnBackground: LogoOnBackgroundHeader,
    pinterest: PinterestHeader,
    maitsu: MaitsuHeader,
    // Add more as needed
  };
  
  const HeaderComponent = headers[project.headerType] || LogoOnBackgroundHeader;
</script>

{#if project.headerType !== 'none'}
  <HeaderComponent {project} />
{/if}
```

### 4. Update Project Detail Page
Modify `/routes/work/[slug]/+page.svelte` to use the new header system instead of the current static header.

### 5. Admin UI Integration
Add a select field to the project form components:

```svelte
<Select
  label="Header Type"
  name="headerType"
  value={formData.headerType}
  onchange={(e) => formData.headerType = e.target.value}
>
  <option value="none">No Header</option>
  <option value="logoOnBackground">Logo on Background (Default)</option>
  <option value="pinterest">Pinterest Header</option>
  <option value="maitsu">Maitsu Header</option>
</Select>
```

## Header Type Specifications

### LogoOnBackgroundHeader (Default)
- Current behavior: centered logo with title and subtitle
- Uses project's `logoUrl`, `backgroundColor`, and text
- Simple, clean presentation

### PinterestHeader
- Interactive grid of Pinterest-style cards
- Cards rearrange/animate on hover
- Could pull from project gallery or use custom assets
- Red color scheme matching Pinterest brand

### MaitsuHeader
- Japanese-inspired animations
- Could feature:
  - Animated kanji/hiragana characters
  - Zen garden simulation with interactive elements
  - Particle effects resembling cherry blossoms
- Uses project colors for theming

### None
- No header displayed
- Project content starts immediately

## Data Available to Headers
Each header component receives the full project object with access to:
- `project.logoUrl` - Project logo
- `project.backgroundColor` - Primary background color
- `project.highlightColor` - Accent color
- `project.featuredImage` - Featured image (currently unused)
- `project.gallery` - Array of project images
- `project.title`, `project.subtitle` - Text content
- All other project fields

## Future Considerations

### Potential Additional Header Types
- **SlackHeader**: Animated emoji reactions floating up
- **FigmaHeader**: Interactive design tools/cursors
- **TypegraphicaHeader**: Kinetic typography animations
- **Custom**: Allow arbitrary component code (requires security considerations)

### Possible Enhancements
1. **Configuration Options**: Add a `headerConfig` JSON field for component-specific settings
2. **Asset Management**: Dedicated header assets separate from project gallery
3. **Responsive Behaviors**: Different animations for mobile vs desktop
4. **Performance Optimization**: Lazy loading for complex animations
5. **A/B Testing**: Support multiple headers per project for testing

## Implementation Steps
1. Add `headerType` field to Prisma schema
2. Create database migration
3. Create base `ProjectHeader` switcher component
4. Implement `LogoOnBackgroundHeader` (extract current behavior)
5. Create custom header components (Pinterest, Maitsu)
6. Update project detail page to use new system
7. Add header type selector to admin forms
8. Test all header types
9. Document how to add new header types

## Success Criteria
- Projects can select from multiple header types via admin UI
- Each header type provides a unique, engaging experience
- System is extensible for adding new headers
- No performance regression
- Maintains existing functionality as default
- Clean separation between header components

## Technical Notes
- Use Svelte 5 runes syntax (`$props()`, `$state()`, etc.)
- Leverage existing animation patterns (spring physics, CSS transitions)
- Follow established SCSS variable system
- Ensure headers are responsive
- Consider accessibility (prefers-reduced-motion)