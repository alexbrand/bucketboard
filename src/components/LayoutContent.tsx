'use client';

import { Navigation } from '@/components/Navigation';
import { GlobalKeyboardShortcuts } from '@/components/GlobalKeyboardShortcuts';
import { ShortcutsProvider } from '@/components/ShortcutsContext';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <ShortcutsProvider>
      <GlobalKeyboardShortcuts />
      <Navigation />
      <main className="min-h-screen bg-background">{children}</main>
    </ShortcutsProvider>
  );
}
