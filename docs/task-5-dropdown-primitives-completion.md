# Task 5: Dropdown, Modal, and Click-Outside Primitives

**Status:** ✅ **COMPLETED** (Oct 8, 2025)

## Implementation Summary

Task 5 was **~85% complete** when reviewed. The core infrastructure was already in place and working well. This completion focused on final cleanup and documentation.

### What Already Existed

**1. Click-Outside Action** (`src/lib/actions/clickOutside.ts`)
- ✅ Full TypeScript implementation with proper typing
- ✅ Supports options (`enabled`, `callback`)
- ✅ Dispatches custom `clickoutside` event
- ✅ Proper cleanup in `destroy()` lifecycle
- ✅ Already used in ~10 components

**2. Dropdown Component Primitives**
- ✅ `BaseDropdown.svelte` - Uses Svelte 5 snippets + clickOutside
- ✅ `DropdownMenuContainer.svelte` - Positioning wrapper
- ✅ `DropdownItem.svelte` - Individual menu items
- ✅ `DropdownMenu.svelte` - Advanced dropdown with submenus (uses Floating UI)
- ✅ Specialized dropdowns: `StatusDropdown`, `PostDropdown`, `PublishDropdown`

**3. Integration**
- ✅ Projects list items use clickOutside
- ✅ Posts list items use clickOutside
- ✅ Admin components use BaseDropdown pattern
- ✅ Consistent UX across admin interface

### Changes Made (Option A)

**Refactored Components:**
- `GenericMetadataPopover.svelte` - Replaced manual click listener with clickOutside action
  - Removed 11 lines of manual event listener code
  - Now uses standardized clickOutside action
  - Maintains trigger element exclusion logic

### Justified Exceptions

Some components intentionally retain manual `document.addEventListener` calls:

#### 1. **DropdownMenu.svelte** (line 148)
**Why:** Complex submenu hierarchy with hover states
- Uses Floating UI for positioning
- Tracks submenu open/close state with timing
- Needs custom logic to exclude trigger + all submenu elements
- Manual implementation is clearer than trying to force clickOutside

#### 2. **ProjectListItem.svelte** (lines 74-81)
**Why:** Global dropdown coordination pattern
```typescript
// Custom event to close all dropdowns when one opens
document.dispatchEvent(new CustomEvent('closeDropdowns'))
document.addEventListener('closeDropdowns', handleCloseDropdowns)
```
- Ensures only one dropdown open at a time across the page
- Valid pattern for coordinating multiple independent components
- Not appropriate for clickOutside action

#### 3. **BaseModal.svelte** + Forms (Escape key handling)
**Why:** Keyboard event handling, not click-outside detection
- Escape key closes modals
- Cmd/Ctrl+S triggers save in forms
- Different concern from click-outside
- Future: Could extract to `useEscapeKey` or `useKeyboardShortcut` actions

### Current State

**Total manual `document.addEventListener` calls remaining:** 15

| File | Count | Purpose | Status |
|------|-------|---------|--------|
| DropdownMenu.svelte | 1 | Complex submenu logic | ✅ Justified |
| ProjectListItem.svelte | 1 | Global dropdown coordination | ✅ Justified |
| PostListItem.svelte | 1 | Global dropdown coordination | ✅ Justified |
| BaseModal.svelte | 1 | Escape key handling | ✅ Justified |
| Forms (3 files) | 3 | ~~Cmd+S handling~~ | ✅ **Extracted to useFormGuards** |
| GenericMetadataPopover.svelte | ~~1~~ | ~~Click outside~~ | ✅ **Fixed in this task** |
| Various | 8 | Scroll/resize positioning | ✅ Justified (layout, not interaction) |

### Architecture Decisions

**Why Not Use Runed Library?**
- Original plan mentioned Runed for `onClickOutside` utility
- Custom `clickOutside` action already exists and works well
- No need to add external dependency when internal solution is solid
- Runed offers no advantage over current implementation

**Dropdown Pattern:**
- `BaseDropdown.svelte` is the recommended primitive for new dropdowns
- Uses Svelte 5 snippets for flexible content composition
- Supports `$bindable` for open state
- Consistent styling via DropdownMenuContainer

### Testing Approach

**Integration Testing:**
- ✅ Projects list: Dropdown actions work correctly
- ✅ Posts list: Dropdown actions work correctly
- ✅ Media page: Action menus function properly
- ✅ Forms: Metadata popover closes on click outside
- ✅ Only one dropdown open at a time (coordination works)

**Manual QA:**
- [x] Click outside closes dropdowns
- [x] Clicking trigger toggles dropdown
- [x] Multiple dropdowns coordinate properly
- [x] Escape key closes modals
- [x] Keyboard shortcuts work in forms
- [x] Nested/submenu dropdowns work correctly

## API Documentation

### `clickOutside` Action

**Usage:**
```svelte
<script>
  import { clickOutside } from '$lib/actions/clickOutside'

  let isOpen = $state(false)

  function handleClose() {
    isOpen = false
  }
</script>

<div use:clickOutside onclickoutside={handleClose}>
  Dropdown content
</div>

<!-- Or with options -->
<div
  use:clickOutside={{ enabled: isOpen }}
  onclickoutside={handleClose}
>
  Dropdown content
</div>

<!-- Or with callback -->
<div use:clickOutside={() => isOpen = false}>
  Dropdown content
</div>
```

**Parameters:**
- `enabled?: boolean` - Whether action is active (default: true)
- `callback?: () => void` - Optional callback on click outside

**Events:**
- `clickoutside` - Dispatched when user clicks outside element
  - `detail: { target: Node }` - The element that was clicked

### `BaseDropdown` Component

**Usage:**
```svelte
<script>
  import BaseDropdown from './BaseDropdown.svelte'

  let isOpen = $state(false)
</script>

<BaseDropdown bind:isOpen>
  {#snippet trigger()}
    <Button>Open Menu</Button>
  {/snippet}

  {#snippet dropdown()}
    <DropdownMenuContainer>
      <DropdownItem onclick={() => console.log('Action')}>
        Action
      </DropdownItem>
    </DropdownMenuContainer>
  {/snippet}
</BaseDropdown>
```

**Props:**
- `isOpen?: boolean` ($bindable) - Controls dropdown visibility
- `disabled?: boolean` - Disables the dropdown
- `isLoading?: boolean` - Shows loading state
- `dropdownTriggerSize?: 'small' | 'medium' | 'large'` - Size of dropdown toggle
- `onToggle?: (isOpen: boolean) => void` - Callback when dropdown toggles
- `trigger: Snippet` - Content for the trigger button
- `dropdown?: Snippet` - Content for the dropdown menu

## Success Criteria

- [x] `clickOutside` action implemented and typed
- [x] Used consistently across admin components (~10 usages)
- [x] BaseDropdown primitive available for reuse
- [x] Removed duplicated click-outside logic where appropriate
- [x] Manual listeners documented and justified
- [x] Manual QA complete
- [ ] ~~Runed library integration~~ (Not needed - custom solution is better)
- [ ] ~~Extract keyboard handling to actions~~ (Future enhancement)

## Future Enhancements

Potential improvements (not required for task completion):

1. **Keyboard Action Helpers**
   - `useEscapeKey(callback)` - For modals
   - `useKeyboardShortcut(keys, callback)` - For Cmd+S, etc.

2. **Advanced Dropdown Features**
   - Keyboard navigation (arrow keys)
   - Focus trap
   - ARIA attributes for accessibility

3. **Dropdown Positioning**
   - Standardize on Floating UI across all dropdowns
   - Auto-flip when near viewport edges

4. **Icon Standardization**
   - Move inline SVGs to icon components
   - Create icon library in `$lib/icons`

## Related Documents

- [Admin Modernization Plan](./admin-modernization-plan.md)
- [Task 3: Project Form Refactor](./task-3-project-form-refactor-plan.md)
- [Task 4: List Filtering Utilities](./task-4-list-filters-completion.md)

## Files Modified

**Modified:**
- `src/lib/components/admin/GenericMetadataPopover.svelte` (replaced manual listener)

**Documented:**
- `src/lib/actions/clickOutside.ts` (already existed, now documented)
- `src/lib/components/admin/BaseDropdown.svelte` (already existed, now documented)
- Remaining manual listeners (justified exceptions)

## Notes

- Runed library was mentioned in original plan but not needed
- Custom `clickOutside` implementation is production-ready
- Most work was already complete; this task focused on cleanup and documentation
- Manual event listeners that remain are intentional and justified
