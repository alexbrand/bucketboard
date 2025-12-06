'use client';

import { useState, useEffect } from 'react';
import { Package, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StorageProvider } from '@/lib/types/credentials';
import { useCachedFetch, createCacheKey, DEFAULT_TTL } from '@/lib/utils/use-cached-fetch';
import { Card } from '@/components/ui/card';

interface Credential {
  id: string;
  name: string;
  provider: StorageProvider;
}

interface Bucket {
  name: string;
  creationDate?: string;
  region?: string;
}

interface CredentialsResponse {
  credentials: Credential[];
}

interface BucketsResponse {
  buckets: Bucket[];
  credentialId: string;
}

interface AppSidebarProps {
  selectedCredentialId: string;
  onCredentialChange: (credentialId: string) => void;
  selectedBucket: string;
  onBucketSelect: (bucketName: string) => void;
}

export function AppSidebar({
  selectedCredentialId,
  onCredentialChange,
  selectedBucket,
  onBucketSelect,
}: AppSidebarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch credentials
  const {
    data: credentialsData,
    loading: credentialsLoading,
  } = useCachedFetch<CredentialsResponse>(
    'credentials',
    async () => {
      const response = await fetch('/api/credentials');
      if (!response.ok) throw new Error('Failed to fetch credentials');
      return response.json();
    },
    {
      ttl: DEFAULT_TTL.CREDENTIALS,
      useLocalStorage: true,
    }
  );

  const credentials = credentialsData?.credentials || [];

  // Auto-select first credential when credentials load
  useEffect(() => {
    if (credentials.length > 0 && !selectedCredentialId) {
      onCredentialChange(credentials[0].id);
    }
  }, [credentials, selectedCredentialId, onCredentialChange]);

  // Fetch buckets
  const {
    data: bucketsData,
    loading: bucketsLoading,
  } = useCachedFetch<BucketsResponse>(
    createCacheKey('buckets', selectedCredentialId),
    async () => {
      if (!selectedCredentialId) throw new Error('No credential selected');
      const response = await fetch(`/api/buckets?credentialId=${selectedCredentialId}`);
      if (!response.ok) throw new Error('Failed to fetch buckets');
      return response.json();
    },
    {
      ttl: DEFAULT_TTL.BUCKETS,
      enabled: !!selectedCredentialId,
    }
  );

  const buckets = bucketsData?.buckets || [];

  const selectedCredential = credentials.find((c) => c.id === selectedCredentialId);

  return (
    <aside
      id="app-sidebar"
      className="flex flex-col bg-background"
      style={{
        width: '256px',
        minWidth: '256px',
        maxWidth: '256px',
        height: '100vh'
      }}
    >
      {/* Context Selector */}
      <div id="credential-selector" className="flex-shrink-0 p-4">
        <Select value={selectedCredentialId} onValueChange={onCredentialChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select credential" />
          </SelectTrigger>
          <SelectContent>
            {credentials.map((cred) => (
              <SelectItem key={cred.id} value={cred.id}>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary">
                    {cred.provider.slice(0, 1).toUpperCase()}
                  </div>
                  <span>{cred.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Buckets List */}
      <div id="buckets-list-container" className="min-h-0 flex-1 overflow-y-auto">
        <div className="pt-3 px-4">
          <div className="mb-7 flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Buckets
            </h3>
            <span className="text-xs text-muted-foreground">{buckets.length}</span>
          </div>

          {credentialsLoading || bucketsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : buckets.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No buckets found
            </div>
          ) : (
            <nav id="buckets-list" className="space-y-1">
              {buckets.map((bucket) => (
                <button
                  key={bucket.name}
                  onClick={() => onBucketSelect(bucket.name)}
                  className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                    selectedBucket === bucket.name
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Package className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate font-medium">{bucket.name}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

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
