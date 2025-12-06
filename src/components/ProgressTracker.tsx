'use client';

import { useEffect, useState } from 'react';

export interface FileProgress {
  id: string;
  filename: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'downloading' | 'completed' | 'error';
  size?: number;
  loaded?: number;
  error?: string;
  type: 'upload' | 'download';
}

interface ProgressTrackerProps {
  items: FileProgress[];
  onClose?: () => void;
  onCancel?: (id: string) => void;
}

export function ProgressTracker({ items, onClose, onCancel }: ProgressTrackerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  if (items.length === 0) return null;

  const completedCount = items.filter((item) => item.status === 'completed').length;
  const errorCount = items.filter((item) => item.status === 'error').length;
  const activeCount = items.filter(
    (item) => item.status === 'uploading' || item.status === 'downloading'
  ).length;
  const totalProgress = items.length > 0 
    ? Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length)
    : 0;

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {activeCount > 0 ? (
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
          ) : completedCount === items.length ? (
            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : errorCount > 0 ? (
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : null}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {activeCount > 0
              ? `Processing ${activeCount} file${activeCount > 1 ? 's' : ''}...`
              : completedCount === items.length
                ? 'All files completed'
                : errorCount > 0
                  ? `${errorCount} file${errorCount > 1 ? 's' : ''} failed`
                  : 'File transfers'}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className={`h-5 w-5 transition-transform ${isMinimized ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {activeCount === 0 && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Overall Progress</span>
          <span>
            {completedCount} / {items.length} ({totalProgress}%)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          ></div>
        </div>
      </div>

      {/* File List */}
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {item.status === 'uploading' && (
                        <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      )}
                      {item.status === 'downloading' && (
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      )}
                      {item.status === 'completed' && (
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {item.status === 'error' && (
                        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {item.status === 'pending' && (
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {item.filename}
                      </p>
                    </div>
                    {item.error && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{item.error}</p>
                    )}
                    {item.size && (
                      <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatBytes(item.loaded || 0)} / {formatBytes(item.size)}</span>
                      </div>
                    )}
                    {(item.status === 'uploading' || item.status === 'downloading') && (
                      <div className="mt-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.progress}%</p>
                      </div>
                    )}
                  </div>
                  {(item.status === 'uploading' || item.status === 'downloading' || item.status === 'pending') && onCancel && (
                    <button
                      onClick={() => onCancel(item.id)}
                      className="ml-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Cancel"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
