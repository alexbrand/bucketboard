'use client';

import { formatShortcut } from '@/lib/utils/use-keyboard-shortcuts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DisplayShortcut {
  key: string;
  description: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

interface ShortcutGroup {
  title: string;
  shortcuts: DisplayShortcut[];
}

// All keyboard shortcuts documentation - shown regardless of current page
const ALL_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'h', description: 'Go to Home' },
      { key: 'b', description: 'Go to Buckets' },
      { key: 'a', description: 'Go to Analytics' },
      { key: 'c', description: 'Go to Connections' },
    ],
  },
  {
    title: 'Object Browser',
    shortcuts: [
      { key: 'u', description: 'Upload files' },
      { key: 'n', description: 'Create new folder' },
      { key: 'r', description: 'Refresh objects' },
      { key: '/', description: 'Focus search' },
      { key: 'p', description: 'Preview selected file' },
      { key: 'Backspace', description: 'Navigate up to parent folder' },
      { key: 'Escape', description: 'Cancel/Close' },
    ],
  },
  {
    title: 'List Navigation',
    shortcuts: [
      { key: 'ArrowDown', description: 'Navigate down in list' },
      { key: 'ArrowUp', description: 'Navigate up in list' },
      { key: 'Enter', description: 'Open folder or view file' },
      { key: ' ', description: 'Toggle selection' },
      { key: 'Home', description: 'Jump to first item' },
      { key: 'End', description: 'Jump to last item' },
    ],
  },
  {
    title: 'Help',
    shortcuts: [{ key: '?', shiftKey: true, description: 'Show keyboard shortcuts' }],
  },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5 text-foreground opacity-90" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and interact with bucketbrowser
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 space-y-6">
          {ALL_SHORTCUTS.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground mb-2">{group.title}</h3>
              <div className="grid grid-cols-2 gap-3">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <span className="flex-1 min-w-0 text-sm font-medium text-foreground leading-relaxed break-words">
                      {shortcut.description}
                    </span>
                    <kbd
                      className="flex-shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-mono text-xs font-semibold shadow-md whitespace-nowrap"
                      style={{ backgroundColor: '#27272a', color: '#ffffff' }}
                    >
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
