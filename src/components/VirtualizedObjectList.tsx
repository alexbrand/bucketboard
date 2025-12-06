'use client';

import { List, useListRef } from 'react-window';
import { useEffect, useState } from 'react';

interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
  storageClass?: string;
  isFolder?: boolean;
}

interface VirtualizedObjectListProps {
  objects: StorageObject[];
  selectedFiles: Set<string>;
  selectedObject: StorageObject | null;
  onToggleFileSelection: (key: string) => void;
  onNavigateToFolder: (key: string) => void;
  onViewObjectMetadata: (object: StorageObject) => void;
  formatBytes: (bytes: number) => string;
  showNavigateUp?: boolean;
  onNavigateUp?: () => void;
  onFolderHover?: (key: string) => void;
  onFileHover?: (object: StorageObject) => void;
}

interface RowData {
  objects: StorageObject[];
  selectedFiles: Set<string>;
  selectedObject: StorageObject | null;
  showNavigateUp: boolean;
  onToggleFileSelection: (key: string) => void;
  onNavigateToFolder: (key: string) => void;
  onViewObjectMetadata: (object: StorageObject) => void;
  onNavigateUp?: () => void;
  formatBytes: (bytes: number) => string;
  onFolderHover?: (key: string) => void;
  onFileHover?: (object: StorageObject) => void;
}

const RowComponent = ({
  index,
  style,
  ...data
}: {
  index: number;
  style: React.CSSProperties;
} & RowData) => {
  const {
    objects,
    selectedFiles,
    selectedObject,
    showNavigateUp,
    onToggleFileSelection,
    onNavigateToFolder,
    onViewObjectMetadata,
    onNavigateUp,
    formatBytes,
    onFolderHover,
    onFileHover,
  } = data;

  // Handle "Navigate Up" button
  if (showNavigateUp && index === 0) {
    return (
      <div style={style}>
        <button
          onClick={onNavigateUp}
          className="flex w-full items-center border-b border-gray-200 px-6 py-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Go up
          </span>
        </button>
      </div>
    );
  }

  // Adjust index if "Navigate Up" is shown
  const objectIndex = showNavigateUp ? index - 1 : index;
  const object = objects[objectIndex];

  if (!object) {
    return <div style={style} />;
  }

  return (
    <div
      style={style}
      className={`flex items-center border-b border-gray-200 px-6 py-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 ${
        selectedObject?.key === object.key ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onMouseEnter={() => {
        if (object.isFolder && onFolderHover) {
          onFolderHover(object.key);
        } else if (!object.isFolder && onFileHover) {
          onFileHover(object);
        }
      }}
    >
      <input
        type="checkbox"
        checked={selectedFiles.has(object.key)}
        onChange={() => onToggleFileSelection(object.key)}
        className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <button
        onClick={() =>
          object.isFolder ? onNavigateToFolder(object.key) : onViewObjectMetadata(object)
        }
        className="flex flex-1 items-center"
      >
        {object.isFolder ? (
          <svg
            className="h-5 w-5 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        ) : (
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
        <div className="ml-3 flex-1 text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {object.key.split('/').filter(Boolean).pop()}
          </p>
          {!object.isFolder && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatBytes(object.size)} •{' '}
              {new Date(object.lastModified).toLocaleString()}
            </p>
          )}
        </div>
      </button>
    </div>
  );
};

export function VirtualizedObjectList({
  objects,
  selectedFiles,
  selectedObject,
  onToggleFileSelection,
  onNavigateToFolder,
  onViewObjectMetadata,
  formatBytes,
  showNavigateUp = false,
  onNavigateUp,
  onFolderHover,
  onFileHover,
}: VirtualizedObjectListProps) {
  const listRef = useListRef(null);
  const [listHeight, setListHeight] = useState(600);

  // Scroll to top when objects change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToRow({ index: 0 });
    }
  }, [objects]);

  const itemCount = objects.length + (showNavigateUp ? 1 : 0);
  const rowHeight = 56; // Height of each row in pixels

  if (itemCount === 0) {
    return null;
  }

  const rowProps: RowData = {
    objects,
    selectedFiles,
    selectedObject,
    showNavigateUp,
    onToggleFileSelection,
    onNavigateToFolder,
    onViewObjectMetadata,
    onNavigateUp,
    formatBytes,
    onFolderHover,
    onFileHover,
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <List<RowData>
        listRef={listRef}
        defaultHeight={listHeight}
        rowCount={itemCount}
        rowHeight={rowHeight}
        rowComponent={RowComponent}
        rowProps={rowProps}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
      />
    </div>
  );
}
