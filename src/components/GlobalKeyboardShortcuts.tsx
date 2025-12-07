'use client';

import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/utils/use-keyboard-shortcuts';
import { useShortcuts } from '@/components/ShortcutsContext';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const { showHelp, hideHelp, isOpen } = useShortcuts();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      description: 'Go to Home',
      action: () => router.push('/'),
    },
    {
      key: 'b',
      description: 'Go to Buckets',
      action: () => router.push('/buckets'),
    },
    {
      key: 'a',
      description: 'Go to Analytics',
      action: () => router.push('/analytics'),
    },
    {
      key: 'c',
      description: 'Go to Connections',
      action: () => router.push('/connections'),
    },
    {
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts help',
      action: () => showHelp(),
      ignoreInInput: false, // Allow even in inputs
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <>
      {/* Help button indicator */}
      <Button
        onClick={showHelp}
        className="fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full p-0 shadow-lg"
        title="Keyboard shortcuts (Shift+?)"
        size="icon"
      >
        <Keyboard className="h-5 w-5" />
      </Button>

      <KeyboardShortcutsHelp isOpen={isOpen} onClose={hideHelp} />
    </>
  );
}
