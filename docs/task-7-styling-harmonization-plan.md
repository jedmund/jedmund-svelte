# Task 7: Styling & Theming Harmonization Plan

**Status:** 🚧 **IN PROGRESS**

## Architecture Overview

**Three-layer system for future theming:**

1. **Base colors** (`variables.scss`): `$gray-80`, `$red-60`, etc.
2. **Semantic SCSS variables** (`variables.scss`): `$input-bg: $gray-90`, `$error-bg: rgba($red-60, 0.1)`
3. **CSS custom properties** (`themes.scss`): `--input-bg: #{$input-bg}` (ready for dark mode)

**Component usage:** Components import `variables.scss` and use SCSS variables (`background: $input-bg`)

**Future dark mode:** Remap CSS custom properties in `[data-theme='dark']` block without touching components

## Current State (Audit Results)

**Hardcoded Values Found:**
- 18 hardcoded `padding: Xpx` values
- 2 hardcoded `margin: Xpx` values
- 91 `rgba()` color definitions
- 127 hex color values (`#xxx`)

**Existing Foundation (Good):**
- ✅ $unit system (8px base with $unit-half, $unit-2x, etc.)
- ✅ Color scales ($gray-00 through $gray-100, etc.)
- ✅ Some semantic variables ($bg-color, $text-color, $accent-color)
- ✅ themes.scss already maps SCSS → CSS variables

## Implementation Plan

### Step 1: Add Semantic SCSS Variables to `variables.scss`

Add component-specific semantic mappings (SCSS only, no double dashes):

```scss
/* Component-Specific Semantic Colors
 * These map base colors to component usage
 * Will be exposed as CSS custom properties in themes.scss
 * -------------------------------------------------------------------------- */

// Inputs & Forms
$input-bg: $gray-90;
$input-bg-hover: $gray-85;
$input-bg-focus: $white;
$input-text: $gray-20;
$input-text-hover: $gray-10;
$input-border: $gray-80;
$input-border-focus: $blue-40;

// States (errors, success, warnings)
$error-bg: rgba($red-60, 0.1);
$error-text: $red-error;  // Already defined as #dc2626
$error-border: rgba($red-60, 0.2);

$success-bg: rgba($green-40, 0.1);
$success-text: $green-30;
$success-border: rgba($green-40, 0.2);

$warning-bg: rgba($yellow-50, 0.1);
$warning-text: $yellow-10;
$warning-border: rgba($yellow-50, 0.2);

// Empty states
$empty-state-text: $gray-40;
$empty-state-heading: $gray-20;

// Cards & Containers
$card-bg: $white;
$card-border: $gray-80;
$card-shadow: rgba($black, 0.08);
$card-shadow-hover: rgba($black, 0.12);

// Dropdowns & Popovers
$dropdown-bg: $white;
$dropdown-border: $gray-80;
$dropdown-shadow: rgba($black, 0.12);
$dropdown-item-hover: $gray-95;

// Modals
$modal-overlay: rgba($black, 0.5);
$modal-bg: $white;
$modal-shadow: rgba($black, 0.15);
```

### Step 2: Map to CSS Custom Properties in `themes.scss`

Extend existing `themes.scss` with new mappings:

```scss
:root {
  // Existing mappings
  --bg-color: #{$gray-80};
  --page-color: #{$gray-100};
  --card-color: #{$gray-90};
  --mention-bg-color: #{$gray-90};
  --text-color: #{$gray-20};

  // New semantic mappings
  --input-bg: #{$input-bg};
  --input-bg-hover: #{$input-bg-hover};
  --input-bg-focus: #{$input-bg-focus};
  --input-text: #{$input-text};
  --input-border: #{$input-border};

  --error-bg: #{$error-bg};
  --error-text: #{$error-text};
  --error-border: #{$error-border};

  --success-bg: #{$success-bg};
  --success-text: #{$success-text};

  --empty-state-text: #{$empty-state-text};
  --empty-state-heading: #{$empty-state-heading};

  --card-bg: #{$card-bg};
  --card-border: #{$card-border};
  --card-shadow: #{$card-shadow};

  --dropdown-bg: #{$dropdown-bg};
  --dropdown-shadow: #{$dropdown-shadow};

  // ... etc
}

[data-theme='dark'] {
  // Future: remap for dark mode without touching component code
  // --input-bg: #{$dark-input-bg};
  // --card-bg: #{$dark-card-bg};
}
```

### Step 3: Fix Hardcoded Spacing (Use $unit System)

Replace hardcoded px values with $unit-based values:

```scss
// ❌ Before
padding: 24px;
margin: 12px 16px;
border-radius: 6px;

// ✅ After
padding: $unit-3x;  // 24px = 8px * 3
margin: calc($unit * 1.5) $unit-2x;  // 12px 16px
border-radius: $corner-radius-sm;  // Already defined as 6px
```

**Files to update:** ~20 files with hardcoded spacing

### Step 4: Replace Hardcoded Colors (Use Semantic SCSS)

Replace inline rgba/hex with semantic SCSS variables:

```scss
// ❌ Before
.error {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

// ✅ After
.error {
  background: $error-bg;
  color: $error-text;
  border: $unit-1px solid $error-border;
}
```

**Files to update:** 40 files with hardcoded colors

### Step 5: Extract Reusable Components

**A. `EmptyState.svelte`** (~10 usages)
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    message: string
    icon?: Snippet
    action?: Snippet
  }
  let { title, message, icon, action }: Props = $props()
</script>

<div class="empty-state">
  {#if icon}
    <div class="empty-icon">{@render icon()}</div>
  {/if}
  <h3>{title}</h3>
  <p>{message}</p>
  {#if action}
    <div class="empty-action">{@render action()}</div>
  {/if}
</div>

<style lang="scss">
  @import '$styles/variables.scss';

  .empty-state {
    text-align: center;
    padding: $unit-8x $unit-4x;
    color: $empty-state-text;

    h3 {
      font-size: calc($unit * 2.5);  // 20px
      font-weight: 600;
      margin: 0 0 $unit-2x;
      color: $empty-state-heading;
    }

    p {
      margin: 0;
      line-height: 1.5;
    }

    .empty-action {
      margin-top: $unit-3x;
    }
  }
</style>
```

**B. `ErrorMessage.svelte`** (~4 usages)
```svelte
<script lang="ts">
  interface Props {
    message: string
    dismissible?: boolean
    onDismiss?: () => void
  }
  let { message, dismissible = false, onDismiss }: Props = $props()
</script>

<div class="error-message">
  <span class="error-text">{message}</span>
  {#if dismissible && onDismiss}
    <button type="button" class="dismiss-btn" onclick={onDismiss}>×</button>
  {/if}
</div>

<style lang="scss">
  @import '$styles/variables.scss';

  .error-message {
    background: $error-bg;
    color: $error-text;
    padding: $unit-3x;
    border-radius: $unit-2x;
    border: $unit-1px solid $error-border;
    text-align: center;
    margin-bottom: $unit-4x;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $unit-2x;

    .error-text {
      flex: 1;
    }

    .dismiss-btn {
      background: none;
      border: none;
      color: $error-text;
      font-size: calc($unit * 3);
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.6;

      &:hover {
        opacity: 1;
      }
    }
  }
</style>
```

### Step 6: Documentation

Create `docs/task-7-styling-harmonization-completion.md` with:
- Architecture explanation (3-layer system)
- Semantic variable naming conventions
- How to add new semantic mappings
- Component usage patterns
- Future dark mode approach

## Implementation Order

1. **Add semantic SCSS variables** to `variables.scss` (~30 new variables)
2. **Map to CSS custom properties** in `themes.scss` (~30 new mappings)
3. **Fix spacing in high-impact files** (projects/posts pages, forms, modals)
4. **Replace hardcoded colors** with semantic SCSS variables
5. **Create EmptyState component** and replace ~10 usages
6. **Create ErrorMessage component** and replace ~4 usages
7. **Document approach** in task-7 completion doc
8. **Update admin modernization plan** to mark Task 7 complete

## Success Criteria

- [ ] ~30 semantic SCSS variables added to variables.scss
- [ ] ~30 CSS custom properties mapped in themes.scss
- [ ] All hardcoded spacing uses $unit system (20 files)
- [ ] All colors use semantic SCSS variables (40 files)
- [ ] EmptyState component created and integrated (10 usages)
- [ ] ErrorMessage component created and integrated (4 usages)
- [ ] No rgba() or hex in admin components (use SCSS variables)
- [ ] Documentation complete
- [ ] Build passes, manual QA complete

## Benefits

✅ **Theme-ready**: Dark mode = remap CSS vars in themes.scss only
✅ **Maintainability**: Change semantic variable once, updates everywhere
✅ **Consistency**: All empty states/errors look identical
✅ **DX**: Autocomplete for semantic variable names
✅ **Reduced duplication**: ~200-300 lines of styles removed
