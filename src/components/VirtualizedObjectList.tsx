'use client';

import { List, useListRef } from 'react-window';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/utils/file-icons';

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
      <div
        style={style}
        className={cn(
          'grid grid-cols-[auto_1fr_120px_200px] items-center gap-4 border-b px-6 py-3 hover:bg-accent cursor-pointer',
          isFocused && 'ring-2 ring-inset ring-ring'
        )}
        onClick={onNavigateUp}
      >
        <div className="flex items-center justify-center h-4 w-4">
          {/* Placeholder for checkbox alignment */}
        </div>
        <div className="flex items-center min-w-0">
          <ArrowUp className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <span className="ml-3 text-sm font-medium">Go up</span>
        </div>
        <div></div>
        <div></div>
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
        'grid grid-cols-[auto_1fr_120px_200px] items-center gap-4 border-b px-6 py-3 hover:bg-accent cursor-pointer',
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
      <div className="flex items-center justify-center">
        <Checkbox
          checked={selectedFiles.has(object.key)}
          onCheckedChange={() => onToggleFileSelection(object.key)}
          className="border-muted-foreground/50 data-[state=checked]:bg-muted-foreground data-[state=checked]:text-muted"
        />
      </div>
      <button
        onClick={() =>
          object.isFolder ? onNavigateToFolder(object.key) : onViewObjectMetadata(object)
        }
        className="flex items-center min-w-0 text-left cursor-pointer"
      >
        {(() => {
          const IconComponent = getFileIcon(object.key, object.isFolder);
          return (
            <IconComponent
              className={cn(
                'h-5 w-5 flex-shrink-0',
                'text-primary'
              )}
            />
          );
        })()}
        <span className="ml-3 text-sm font-medium truncate">
          {object.key.split('/').filter(Boolean).pop()}
        </span>
      </button>
      <div className="text-right text-sm text-muted-foreground flex items-center justify-end">
        {!object.isFolder && formatBytes(object.size)}
      </div>
      <div className="text-right text-sm text-muted-foreground whitespace-nowrap flex items-center justify-end">
        {!object.isFolder && new Date(object.lastModified).toLocaleString()}
      </div>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);

  // Measure container height dynamically
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        if (height > 0) {
          setListHeight(height);
        }
      }
    };

    // Initial measurement
    updateHeight();

    // Use ResizeObserver to handle dynamic size changes
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
    <div ref={containerRef} className="h-full overflow-hidden">
      {listHeight > 0 && (
        <List<RowData>
          listRef={listRef}
          height={listHeight}
          rowCount={itemCount}
          rowHeight={rowHeight}
          rowComponent={RowComponent}
          rowProps={rowProps}
          className="scrollbar-thin"
        />
      )}
    </div>
  );
}
