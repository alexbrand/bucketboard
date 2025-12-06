'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Moon, Sun, BarChart3, Key } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Navigation() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="flex h-12 items-center justify-between border-b bg-background px-4">
      <Link href="/buckets" className="flex items-center gap-2 cursor-pointer">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <span className="text-sm font-bold text-primary-foreground">B</span>
        </div>
        <span className="text-sm font-semibold">BucketBoard</span>
      </Link>

      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href="/analytics" title="Analytics">
            <BarChart3 className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/credentials" title="Credentials">
            <Key className="h-4 w-4" />
          </Link>
        </Button>
        <div className="ml-2 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
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
    </nav>
  );
}
