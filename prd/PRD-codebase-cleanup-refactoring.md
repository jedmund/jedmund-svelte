# PRD: Codebase Cleanup and Refactoring

**Date**: December 26, 2025  
**Author**: Claude Code  
**Status**: Draft  
**Priority**: High  

## Executive Summary

This PRD outlines a comprehensive cleanup and refactoring plan for the jedmund-svelte Svelte 5 codebase. The analysis has identified significant opportunities to reduce code complexity, eliminate duplication, and improve maintainability through systematic refactoring.

## Goals

1. **Simplify overengineered components** - Break down complex components into smaller, focused units
2. **Eliminate dead code** - Remove unused components, functions, and imports
3. **Reduce code duplication** - Extract common patterns into reusable components and utilities
4. **Standardize styling** - Convert hardcoded values to CSS variables and create consistent patterns
5. **Optimize SVG usage** - Remove unused SVGs and create reusable icon components

## Key Findings

### 1. Overengineered Components
- **EnhancedComposer** (1,347 lines) - Handles too many responsibilities
- **LastFM Stream Server** (625 lines) - Complex data transformations that could be simplified
- **Multiple Media Modals** - Overlapping functionality across 3+ modal components
- **Complex State Management** - Components with 10-20 state variables

### 2. Unused Code
- 5 unused components (Squiggly, PhotoLightbox, Pill, SVGHoverEffect, MusicPreview)
- 13 unused SVG files (2 icons, 11 illustrations)
- Minimal commented-out code (good!)
- 1 potentially unused API endpoint (/api/health)

### 3. DRY Violations
- **Photo Grid Components** - 3 nearly identical components
- **Modal Components** - Duplicate backdrop and positioning logic
- **Dropdown Components** - Repeated dropdown patterns
- **Form Components** - Overlapping FormField and FormFieldWrapper
- **Segmented Controllers** - Duplicate animation and positioning logic

### 4. Hardcoded Values
- **Colors**: 200+ hardcoded hex/rgba values instead of using existing variables
- **Spacing**: 1,000+ hardcoded pixel values instead of using `$unit` system
- **Z-indexes**: 60+ hardcoded z-index values without consistent scale
- **Animations**: Hardcoded durations instead of using constants
- **Border radius**: Not using existing `$corner-radius-*` variables

### 5. SVG Issues
- 7+ duplicate inline close button SVGs
- 3+ duplicate loading spinner SVGs
- Inconsistent import patterns
- Inline SVGs that should be componentized

## Implementation Timeline

### Phase 1: Quick Wins (Week 1)
Focus on low-risk, high-impact changes that don't require architectural modifications.

- [x] **Remove unused components** (5 components)
  - [x] Delete `/src/lib/components/Squiggly.svelte`
  - [x] Delete `/src/lib/components/PhotoLightbox.svelte`
  - [x] Delete `/src/lib/components/Pill.svelte`
  - [x] Delete `/src/lib/components/SVGHoverEffect.svelte`
  - [x] Delete `/src/lib/components/MusicPreview.svelte`

- [x] **Remove unused SVG files** (13 files)
  - [x] Delete unused icons: `dashboard.svg`, `metadata.svg`
  - [x] Delete unused illustrations (11 files - see SVG analysis report)

- [x] **Clean up dead code**
  - [x] Remove commented `getWeeklyAlbumChart` line in `/src/routes/api/lastfm/+server.ts`
  - [x] Address TODO in `/src/lib/server/api-utils.ts` about authentication (noted for future work)

### Phase 2: CSS Variable Standardization (Week 2)
Create a consistent design system by extracting hardcoded values.

- [x] **Create z-index system**
  - [x] Create `src/assets/styles/_z-index.scss` with constants
  - [x] Replace 60+ hardcoded z-index values

- [x] **Extract color variables**
  - [x] Add missing color variables for frequently used colors
  - [x] Replace 200+ hardcoded hex/rgba values (replaced most common colors)
  - [x] Create shadow/overlay variables for rgba values

- [x] **Standardize spacing**
  - [x] Add missing unit multipliers (added `$unit-7x` through `$unit-19x` and common pixel values)
  - [x] Replace 1,000+ hardcoded pixel values with unit variables (replaced in key components)

- [x] **Define animation constants**
  - [x] Create transition/animation duration variables
  - [x] Replace hardcoded duration values (replaced in key components)

### Phase 3: Component Refactoring (Weeks 3-4)
Refactor components to reduce duplication and complexity.

- [-] **Create base components**
  - [x] Extract `BaseModal` component for shared modal logic
  - [x] Create `BaseDropdown` for dropdown patterns
  - [ ] Merge `FormField` and `FormFieldWrapper`
  - [ ] Create `BaseSegmentedController` for shared logic

- [ ] **Refactor photo grids**
  - [ ] Create unified `PhotoGrid` component with `columns` prop
  - [ ] Remove 3 duplicate grid components
  - [ ] Use composition for layout variations

- [ ] **Componentize inline SVGs**
  - [ ] Create `CloseButton` icon component
  - [ ] Create `LoadingSpinner` component
  - [ ] Create `NavigationArrow` components
  - [ ] Extract other repeated inline SVGs

### Phase 4: Complex Refactoring (Weeks 5-6)
Tackle the most complex components and patterns.

- [ ] **Refactor EnhancedComposer**
  - [ ] Split into focused sub-components
  - [ ] Extract toolbar component
  - [ ] Separate media management
  - [ ] Create dedicated link editor
  - [ ] Reduce state variables from 20+ to <10

- [ ] **Simplify LastFM Stream Server**
  - [ ] Extract data transformation utilities
  - [ ] Simplify "now playing" detection algorithm
  - [ ] Reduce state tracking duplication
  - [ ] Create separate modules for complex logic

- [ ] **Consolidate media modals**
  - [ ] Create single flexible MediaModal component
  - [ ] Use composition for different modes
  - [ ] Eliminate prop drilling with stores

### Phase 5: Architecture & Utilities (Week 7)
Improve overall architecture and create shared utilities.

- [ ] **Create shared utilities**
  - [ ] API client with consistent error handling
  - [ ] CSS mixins for common patterns
  - [ ] Media handling utilities
  - [ ] Form validation utilities

- [ ] **Standardize patterns**
  - [ ] Create middleware for API routes
  - [ ] Implement consistent error handling
  - [ ] Standardize data fetching patterns
  - [ ] Create shared animation definitions

### Phase 6: Testing & Documentation (Week 8)
Ensure changes don't break functionality and document new patterns.

- [ ] **Testing**
  - [ ] Run full build and type checking
  - [ ] Test all refactored components
  - [ ] Verify no regressions in functionality
  - [ ] Check bundle size improvements

- [ ] **Documentation**
  - [ ] Update component documentation
  - [ ] Document new patterns and utilities
  - [ ] Update Storybook stories for new components
  - [ ] Create migration guide for team

## Success Metrics

1. **Code Reduction**
   - Target: 20-30% reduction in total lines of code
   - Eliminate 1,000+ instances of code duplication

2. **Component Simplification**
   - No component larger than 500 lines
   - Average component size under 200 lines

3. **Design System Consistency**
   - Zero hardcoded colors in components
   - All spacing using design tokens
   - Consistent z-index scale

4. **Bundle Size**
   - 10-15% reduction in JavaScript bundle size
   - Removal of unused assets

5. **Developer Experience**
   - Faster build times
   - Easier component discovery
   - Reduced cognitive load

## Risk Mitigation

1. **Regression Testing**
   - Test each phase thoroughly before moving to next
   - Keep backups of original components during refactoring
   - Use feature flags for gradual rollout if needed

2. **Performance Impact**
   - Monitor bundle size after each phase
   - Profile component render performance
   - Ensure no performance regressions

3. **Team Coordination**
   - Communicate changes clearly
   - Update documentation as you go
   - Create clear migration paths

## Rollback Plan

Each phase should be implemented as a separate git branch with the ability to revert if issues arise. Keep the old components available until the new ones are fully tested and stable.

## Appendix

- [SVG Analysis Report](/Users/justin/Developer/Personal/jedmund-svelte/SVG_ANALYSIS_REPORT.md) - Detailed SVG usage analysis
- [Component Analysis](#) - Detailed breakdown of component complexity
- [CSS Variable Audit](#) - Complete list of hardcoded values to replace

---

**Next Steps**: Review this PRD and approve the implementation timeline. Each phase can be tracked using the checkboxes above.