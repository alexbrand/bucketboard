'use client';

import { Navigation } from '@/components/Navigation';
import { GlobalKeyboardShortcuts } from '@/components/GlobalKeyboardShortcuts';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalKeyboardShortcuts />
      <Navigation />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</main>
    </>
  );
}
