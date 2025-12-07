'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Moon, Sun, Package } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function SimpleSidebar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside
      id="simple-sidebar"
      className="flex flex-col bg-background"
      style={{
        width: '256px',
        minWidth: '256px',
        maxWidth: '256px',
        height: '100vh',
      }}
    >
      {/* Logo/Brand */}
      <div id="sidebar-logo" className="flex-shrink-0 p-4">
        <Link href="/buckets" className="flex items-center gap-3 cursor-pointer">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-lg font-bold">BucketBoard</div>
            <div className="text-xs text-muted-foreground">Cloud Storage</div>
          </div>
        </Link>
      </div>

      {/* Spacer */}
      <div className="min-h-0 flex-1" />

      {/* Theme toggle */}
      <div id="sidebar-theme-toggle" className="flex-shrink-0 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="h-9 w-9"
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
