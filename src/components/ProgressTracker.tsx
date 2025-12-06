'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, X, Upload, Download, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

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
    <Card className="fixed bottom-4 right-4 z-50 w-96 shadow-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {activeCount > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : completedCount === items.length ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : errorCount > 0 ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : null}
            <h3 className="text-sm font-semibold">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
            </Button>
            {activeCount === 0 && onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Overall Progress Bar */}
        <div className="mb-4 pb-4 border-b">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Overall Progress</span>
            <span>
              {completedCount} / {items.length} ({totalProgress}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            ></div>
          </div>
        </div>

        {/* File List */}
        {!isMinimized && (
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {item.status === 'uploading' && (
                          <Upload className="h-4 w-4 text-primary" />
                        )}
                        {item.status === 'downloading' && (
                          <Download className="h-4 w-4 text-primary" />
                        )}
                        {item.status === 'completed' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {item.status === 'error' && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        {item.status === 'pending' && (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <p className="truncate text-sm font-medium">
                          {item.filename}
                        </p>
                      </div>
                      {item.error && (
                        <p className="mt-1 text-xs text-destructive">{item.error}</p>
                      )}
                      {item.size && (
                        <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{formatBytes(item.loaded || 0)} / {formatBytes(item.size)}</span>
                        </div>
                      )}
                      {(item.status === 'uploading' || item.status === 'downloading') && (
                        <div className="mt-2">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{item.progress}%</p>
                        </div>
                      )}
                    </div>
                    {(item.status === 'uploading' || item.status === 'downloading' || item.status === 'pending') && onCancel && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 h-6 w-6"
                        onClick={() => onCancel(item.id)}
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
