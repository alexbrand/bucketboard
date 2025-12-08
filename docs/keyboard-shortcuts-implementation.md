# Keyboard Shortcuts Implementation

This document describes the implementation details of the keyboard shortcuts and navigation features in bixo.

## Overview

The keyboard shortcuts system provides comprehensive keyboard navigation and shortcuts throughout bixo to improve navigation efficiency and user productivity.

## Architecture

### Components

1. **`src/lib/utils/use-keyboard-shortcuts.ts`**
   - Custom React hook for managing keyboard shortcuts
   - Type-safe shortcut definitions with modifier key support
   - Smart context awareness (disables in input fields by default)
   - Cross-platform key formatting (macOS symbols vs text)

2. **`src/components/KeyboardShortcutsHelp.tsx`**
   - Modal component displaying available shortcuts
   - Accessible with proper ARIA attributes
   - Escape key to close
   - Click overlay to dismiss

3. **`src/components/GlobalKeyboardShortcuts.tsx`**
   - Manages application-wide navigation shortcuts
   - Floating help button in bottom-right corner
   - Shortcuts for navigating to Home, Buckets, Analytics, Connections

4. **`src/components/LayoutContent.tsx`**
   - Client component wrapper for the layout
   - Integrates GlobalKeyboardShortcuts into the app

5. **`src/components/ShortcutsContext.tsx`**
   - Context provider for managing shortcuts help modal state

## Files Modified

1. **`src/app/layout.tsx`**
   - Updated to use LayoutContent wrapper
   - Maintains server component status for metadata

2. **`src/app/buckets/page.tsx`**
   - Added page-specific shortcuts for object browser
   - Upload files (U), Create folder (N), Refresh (R), Search (/), Navigate up (Backspace)
   - Added keyboard navigation for object list
   - Added refs for programmatic interaction with file input and search

3. **`src/components/VirtualizedObjectList.tsx`**
   - Added focus support for keyboard navigation
   - Visual highlighting for focused items (blue ring)
   - Auto-scroll to keep focused items visible

## Keyboard Shortcuts

### Global (Available Everywhere)

- `H` - Go to Home
- `B` - Go to Buckets
- `A` - Go to Analytics
- `C` - Go to Connections
- `Shift + ?` - Show keyboard shortcuts help

### Object Browser (Buckets Page)

**Actions:**

- `U` - Upload files
- `N` - Create new folder
- `R` - Refresh object list
- `/` - Focus search
- `Backspace` - Navigate up to parent folder
- `Escape` - Cancel/Close current modal or form
- `Shift + ?` - Show object browser shortcuts help

**List Navigation:**

- `↓` (Arrow Down) - Navigate down in object list
- `↑` (Arrow Up) - Navigate up in object list
- `Enter` - Open focused folder or view file metadata
- `Space` - Toggle selection of focused item
- `Home` - Jump to first item in list
- `End` - Jump to last item in list

## Key Features

1. **Context-Aware**: Most shortcuts are disabled when typing in input fields (navigation shortcuts work everywhere)
2. **Cross-Platform**: Automatically detects macOS and shows appropriate symbols (⌘, ⌥, ⌃, ⇧)
3. **Discoverable**: Floating help button and `Shift + ?` shortcut
4. **Accessible**: Enhances keyboard-only navigation with full keyboard control
5. **Non-Intrusive**: Works alongside normal typing and form interactions
6. **Visual Feedback**: Focused items are highlighted with a blue ring
7. **Auto-scrolling**: List automatically scrolls to keep focused items visible

## Implementation Details

### Keyboard Navigation in Object List

The keyboard navigation feature allows users to navigate through files and folders using only the keyboard.

#### Focus Index Management

The focus index is zero-based and includes the "Navigate Up" button when present:

- Index 0 = "Navigate Up" button (when in a subfolder)
- Index 1+ = Actual objects (offset by 1 when "Navigate Up" is shown)

#### Helper Function: getFocusedObject()

```typescript
const getFocusedObject = () => {
  if (focusedIndex < 0) return null;

  // If "Navigate Up" is shown and focused index is 0, return null (it's the up button)
  if (currentPrefix && focusedIndex === 0) return null;

  const objectIndex = currentPrefix ? focusedIndex - 1 : focusedIndex;
  return filteredObjects[objectIndex] || null;
};
```

This helper properly handles the offset when the "Navigate Up" button is present.

#### Auto-scroll Implementation

```typescript
useEffect(() => {
  if (listRef.current && focusedIndex >= 0) {
    listRef.current.scrollToRow({ index: focusedIndex, align: 'auto' });
  }
}, [focusedIndex]);
```

The `align: 'auto'` option ensures the focused item is visible with minimal scrolling.

#### Visual Highlighting

```typescript
className={`... ${isFocused ? 'ring-2 ring-inset ring-blue-500' : ''}`}
```

Uses Tailwind's ring utilities for a clean, accessible focus indicator.

## Testing

- Build verified: ✅ Successful compilation
- Linter: ✅ No errors
- Type checking: ✅ No errors

## Bug Fixes

Fixed modal display issue where the keyboard shortcuts help modal overlay appeared but the content was not visible. Added `relative` positioning to the modal content div to ensure proper z-index stacking above the overlay.

## Future Enhancements

Potential improvements for keyboard shortcuts and navigation:

- Custom user-defined shortcuts
- Shortcut conflicts detection
- Vim-style command mode
- Shortcut customization UI
- Type-to-search: Jump to items by typing their first letters
- Multiple selection with Shift: Select ranges using Shift+Arrow
- Select all with Ctrl/Cmd+A: Quick selection of all items
- Copy/Cut/Paste shortcuts: File operations via keyboard
- Vim-style navigation: Optional h/j/k/l navigation for power users
