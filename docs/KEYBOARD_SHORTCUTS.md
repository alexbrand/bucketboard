# Keyboard Shortcuts

bucketbrowser includes comprehensive keyboard shortcuts to improve navigation efficiency and user productivity.

## Global Shortcuts

These shortcuts work from anywhere in the application:

| Shortcut    | Action                       |
| ----------- | ---------------------------- |
| `H`         | Navigate to Home page        |
| `B`         | Navigate to Buckets page     |
| `A`         | Navigate to Analytics page   |
| `C`         | Navigate to Connections page |
| `Shift + ?` | Show keyboard shortcuts help |

## Object Browser Shortcuts

When viewing objects in a bucket, these additional shortcuts are available:

### Actions

| Shortcut    | Action                             |
| ----------- | ---------------------------------- |
| `U`         | Open file upload dialog            |
| `N`         | Create new folder                  |
| `R`         | Refresh object list                |
| `/`         | Focus search input                 |
| `Backspace` | Navigate up to parent folder       |
| `Escape`    | Cancel/Close current modal or form |
| `Shift + ?` | Show object browser shortcuts help |

### List Navigation

| Shortcut         | Action                                                  |
| ---------------- | ------------------------------------------------------- |
| `↓` (Arrow Down) | Navigate down in object list                            |
| `↑` (Arrow Up)   | Navigate up in object list                              |
| `Enter`          | Open focused folder or view file metadata               |
| `Space`          | Toggle selection of focused item (for batch operations) |
| `Home`           | Jump to first item in list                              |
| `End`            | Jump to last item in list                               |

## Implementation Details

### Architecture

The keyboard shortcuts system is built with:

1. **Custom Hook (`useKeyboardShortcuts`)**: A reusable React hook that manages keyboard event listeners and shortcut matching
2. **Shortcut Definition**: A type-safe interface for defining shortcuts with modifiers (Ctrl, Meta, Shift, Alt)
3. **Help Modal**: An accessible modal component that displays available shortcuts
4. **Smart Context Awareness**: Shortcuts are automatically disabled when typing in input fields (except for specific keys like Escape)

### Components

- **`GlobalKeyboardShortcuts`**: Manages application-wide navigation shortcuts
- **`KeyboardShortcutsHelp`**: Modal dialog displaying shortcuts with proper keyboard formatting
- **`useKeyboardShortcuts`**: Custom hook for registering and handling keyboard events

### Features

- **Cross-platform Support**: Automatically detects macOS and displays appropriate modifier symbols (⌘, ⌥, ⌃, ⇧)
- **Input Context Awareness**: Most shortcuts are disabled while typing in input fields to prevent conflicts
- **Navigation Shortcuts**: Arrow keys work everywhere including in input fields for seamless list navigation
- **Visual Feedback**: Focused items are highlighted with a blue ring for clear visual indication
- **Auto-scrolling**: The list automatically scrolls to keep the focused item visible
- **Accessible**: Keyboard shortcuts enhance accessibility by providing keyboard-only navigation
- **Help Button**: A floating help button in the bottom-right corner provides quick access to shortcuts reference
- **Extensible**: Easy to add new shortcuts by extending the shortcuts array in any component

### Adding New Shortcuts

To add shortcuts to a page:

```typescript
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/utils/use-keyboard-shortcuts';

const shortcuts: KeyboardShortcut[] = [
  {
    key: 'k',
    ctrlKey: true, // Optional modifier
    description: 'Do something',
    action: () => {
      // Your action here
    },
    ignoreInInput: true, // Optional: allow in input fields
  },
];

useKeyboardShortcuts(shortcuts);
```

## User Experience

- **Discoverability**: The floating help button and `Shift + ?` shortcut make shortcuts easily discoverable
- **Visual Feedback**: Shortcuts are displayed in a well-formatted modal with platform-specific symbols
- **Non-intrusive**: Shortcuts don't interfere with normal typing or form interactions
- **Progressive Enhancement**: The app works perfectly without keyboard shortcuts, but they enhance the experience for power users

## Future Enhancements

Potential improvements for the keyboard shortcuts system:

- Custom user-defined shortcuts
- Shortcut conflicts detection
- Vim-style command mode
- Shortcut recording/learning mode
- Keyboard shortcut customization UI
