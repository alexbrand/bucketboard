'use client';

import { GlobalKeyboardShortcuts } from '@/components/GlobalKeyboardShortcuts';
import { ShortcutsProvider } from '@/components/ShortcutsContext';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <ShortcutsProvider>
      <GlobalKeyboardShortcuts />
      <div className="h-screen overflow-hidden bg-background">
        {children}
      </div>
    </ShortcutsProvider>
  );
}
