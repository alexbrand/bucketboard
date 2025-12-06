import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  // Allow shortcuts to be disabled in certain contexts (e.g., when typing in input)
  ignoreInInput?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Find matching shortcut
      const shortcut = shortcuts.find((s) => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = s.ctrlKey === undefined || s.ctrlKey === event.ctrlKey;
        const metaMatch = s.metaKey === undefined || s.metaKey === event.metaKey;
        const shiftMatch = s.shiftKey === undefined || s.shiftKey === event.shiftKey;
        const altMatch = s.altKey === undefined || s.altKey === event.altKey;

        return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        // Check if we should ignore this shortcut (e.g., when typing in input)
        if (shortcut.ignoreInInput !== false) {
          const target = event.target as HTMLElement;
          const tagName = target.tagName.toLowerCase();
          const isEditable = target.isContentEditable;
          const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

          if (isInput || isEditable) {
            // Allow certain keys even in inputs (like Escape)
            if (event.key !== 'Escape') {
              return;
            }
          }
        }

        event.preventDefault();
        shortcut.action();
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

// Type for formatting shortcuts - only includes properties needed for display
export type ShortcutForDisplay = Pick<KeyboardShortcut, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

export function formatShortcut(shortcut: ShortcutForDisplay): string {
  const parts: string[] = [];
  const isMac = typeof window !== 'undefined' && (
    navigator.platform?.toUpperCase().indexOf('MAC') >= 0 ||
    navigator.userAgent?.toUpperCase().indexOf('MAC') >= 0
  );

  if (shortcut.ctrlKey) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.metaKey) parts.push(isMac ? '⌘' : 'Cmd');
  if (shortcut.altKey) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shiftKey) parts.push(isMac ? '⇧' : 'Shift');

  // Format key name nicely
  let keyName = shortcut.key;
  if (keyName === ' ') keyName = 'Space';
  else if (keyName.length === 1) keyName = keyName.toUpperCase();
  else keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);

  parts.push(keyName);

  return parts.join(isMac ? '' : '+');
}
