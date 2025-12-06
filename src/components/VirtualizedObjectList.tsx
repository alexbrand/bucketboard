'use client';

import { List, useListRef } from 'react-window';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUp, Folder, File } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  focusedIndex?: number;
  onFocusedIndexChange?: (index: number) => void;
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
  focusedIndex?: number;
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
    focusedIndex,
  } = data;

  // Handle "Navigate Up" button
  if (showNavigateUp && index === 0) {
    const isFocused = focusedIndex === 0;
    return (
      <div style={style}>
        <Button
          variant="ghost"
          onClick={onNavigateUp}
          className={cn(
            'w-full justify-start rounded-none',
            isFocused && 'ring-2 ring-inset ring-ring'
          )}
        >
          <ArrowUp className="h-5 w-5 text-muted-foreground" />
          <span className="ml-3 text-sm font-medium">Go up</span>
        </Button>
      </div>
    );
  }

  // Adjust index if "Navigate Up" is shown
  const objectIndex = showNavigateUp ? index - 1 : index;
  const object = objects[objectIndex];

  if (!object) {
    return <div style={style} />;
  }

  const isFocused = focusedIndex === index;
  const isSelected = selectedObject?.key === object.key;

  return (
    <div
      style={style}
      className={cn(
        'flex items-center border-b px-6 py-3 hover:bg-accent',
        isSelected && 'bg-primary/5',
        isFocused && 'ring-2 ring-inset ring-ring'
      )}
      onMouseEnter={() => {
        if (object.isFolder && onFolderHover) {
          onFolderHover(object.key);
        } else if (!object.isFolder && onFileHover) {
          onFileHover(object);
        }
      }}
    >
      <Checkbox
        checked={selectedFiles.has(object.key)}
        onCheckedChange={() => onToggleFileSelection(object.key)}
        className="mr-3"
      />
      <button
        onClick={() =>
          object.isFolder ? onNavigateToFolder(object.key) : onViewObjectMetadata(object)
        }
        className="flex flex-1 items-center"
      >
        {object.isFolder ? (
          <Folder className="h-5 w-5 text-primary" />
        ) : (
          <File className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="ml-3 flex-1 text-left">
          <p className="text-sm font-medium">
            {object.key.split('/').filter(Boolean).pop()}
          </p>
          {!object.isFolder && (
            <p className="text-xs text-muted-foreground">
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
  focusedIndex = -1,
  onFocusedIndexChange,
}: VirtualizedObjectListProps) {
  const listRef = useListRef(null);
  const [listHeight, setListHeight] = useState(600);

  // Scroll to top when objects change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToRow({ index: 0 });
    }
  }, [objects]);

  // Scroll to keep focused item visible
  useEffect(() => {
    if (listRef.current && focusedIndex >= 0) {
      listRef.current.scrollToRow({ index: focusedIndex, align: 'auto' });
    }
  }, [focusedIndex]);

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
    focusedIndex,
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <List<RowData>
        listRef={listRef}
        defaultHeight={listHeight}
        rowCount={itemCount}
        rowHeight={rowHeight}
        rowComponent={RowComponent}
        rowProps={rowProps}
        className="scrollbar-thin"
      />
    </div>
  );
}
