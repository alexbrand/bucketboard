'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface FilePreviewProps {
  bucketName: string;
  objectKey: string;
  connectionId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Determine file type from extension
function getFileType(key: string): 'image' | 'text' | 'unsupported' {
  const ext = key.split('.').pop()?.toLowerCase() || '';

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const textExts = [
    'txt',
    'json',
    'xml',
    'html',
    'htm',
    'css',
    'js',
    'ts',
    'tsx',
    'jsx',
    'md',
    'yaml',
    'yml',
    'csv',
    'log',
    'py',
    'java',
    'cpp',
    'c',
    'h',
    'cs',
    'go',
    'rs',
    'rb',
    'php',
    'sh',
    'bash',
  ];

  if (imageExts.includes(ext)) return 'image';
  if (textExts.includes(ext)) return 'text';
  return 'unsupported';
}

// Get language for syntax highlighting class
function getLanguageFromExtension(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() || '';

  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    sh: 'bash',
    bash: 'bash',
    json: 'json',
    xml: 'xml',
    html: 'html',
    htm: 'html',
    css: 'css',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
  };

  return langMap[ext] || 'plaintext';
}

export function FilePreview({
  bucketName,
  objectKey,
  connectionId,
  fileName,
  isOpen,
  onClose,
}: FilePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');

  const fileType = getFileType(objectKey);

  // Load preview content
  const loadPreview = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    setTextContent('');
    setImageUrl('');

    try {
      const previewUrl = `/api/buckets/${bucketName}/preview?connectionId=${connectionId}&key=${encodeURIComponent(objectKey)}`;

      if (fileType === 'image') {
        // For images, just set the URL
        setImageUrl(previewUrl);
        setLoading(false);
      } else if (fileType === 'text') {
        // For text files, fetch and display content
        const response = await fetch(previewUrl);

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: 'Failed to load preview' }));
          throw new Error(errorData.error || 'Failed to load preview');
        }

        const text = await response.text();
        setTextContent(text);
        setLoading(false);
      } else {
        setError('File type not supported for preview');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preview');
      setLoading(false);
    }
  }, [bucketName, objectKey, connectionId, fileType, isOpen]);

  // Load preview when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }
  }, [isOpen, loadPreview]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Preview: {fileName}</DialogTitle>
          <DialogDescription>
            {fileType === 'image' ? 'Image' : fileType === 'text' ? 'Text File' : 'Unsupported'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex h-full items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-2 text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex h-full items-center justify-center min-h-[400px]">
              <div className="text-center">
                <X className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-2 text-sm font-medium">Failed to load preview</h3>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <Button onClick={loadPreview} className="mt-4">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && fileType === 'image' && imageUrl && (
            <div className="flex h-full items-center justify-center min-h-[400px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={fileName || 'Image preview'}
                className="max-h-full max-w-full rounded-lg object-contain"
                onError={() => setError('Failed to load image')}
              />
            </div>
          )}

          {!loading && !error && fileType === 'text' && textContent && (
            <div className="h-full">
              <pre
                className={`overflow-auto rounded-lg border bg-muted p-4 text-sm language-${getLanguageFromExtension(objectKey)}`}
              >
                <code>{textContent}</code>
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button asChild>
            <a
              href={`/api/buckets/${bucketName}/download?connectionId=${connectionId}&key=${encodeURIComponent(objectKey)}`}
              className="inline-flex items-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
