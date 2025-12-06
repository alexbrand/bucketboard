'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/lib/utils/use-keyboard-shortcuts';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';

export function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);

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
      description: 'Go to Credentials',
      action: () => router.push('/credentials'),
    },
    {
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts help',
      action: () => setShowHelp(true),
      ignoreInInput: false, // Allow even in inputs
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <>
      {/* Help button indicator */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="Keyboard shortcuts (Shift+?)"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      </button>

      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={shortcuts}
      />
    </>
  );
}
