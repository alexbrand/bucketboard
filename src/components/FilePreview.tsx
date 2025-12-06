'use client';

import { useEffect, useState, useCallback } from 'react';

interface FilePreviewProps {
  bucketName: string;
  objectKey: string;
  credentialId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Determine file type from extension
function getFileType(key: string): 'image' | 'text' | 'unsupported' {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const textExts = [
    'txt', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'tsx', 'jsx',
    'md', 'yaml', 'yml', 'csv', 'log', 'py', 'java', 'cpp', 'c', 'h',
    'cs', 'go', 'rs', 'rb', 'php', 'sh', 'bash',
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
  credentialId,
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
      const previewUrl = `/api/buckets/${bucketName}/preview?credentialId=${credentialId}&key=${encodeURIComponent(objectKey)}`;
      
      if (fileType === 'image') {
        // For images, just set the URL
        setImageUrl(previewUrl);
        setLoading(false);
      } else if (fileType === 'text') {
        // For text files, fetch and display content
        const response = await fetch(previewUrl);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load preview' }));
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
  }, [bucketName, objectKey, credentialId, fileType, isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      {/* Modal container */}
      <div className="relative flex h-full max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex-1 truncate">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preview: {fileName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {fileType === 'image' ? 'Image' : fileType === 'text' ? 'Text File' : 'Unsupported'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="Close preview"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading preview...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  Failed to load preview
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
                <button
                  onClick={loadPreview}
                  className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          {!loading && !error && fileType === 'image' && imageUrl && (
            <div className="flex h-full items-center justify-center">
              <img
                src={imageUrl}
                alt={fileName}
                className="max-h-full max-w-full rounded-lg object-contain"
                onError={() => setError('Failed to load image')}
              />
            </div>
          )}
          
          {!loading && !error && fileType === 'text' && textContent && (
            <div className="h-full">
              <pre className={`overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-950 language-${getLanguageFromExtension(objectKey)}`}>
                <code className="text-gray-900 dark:text-gray-100">{textContent}</code>
              </pre>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <a
            href={`/api/buckets/${bucketName}/download?credentialId=${credentialId}&key=${encodeURIComponent(objectKey)}`}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg
              className="mr-1.5 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </a>
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
