import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ObjectListSkeletonProps {
  showNavigateUp?: boolean;
  rowCount?: number;
}

export function ObjectListSkeleton({
  showNavigateUp = false,
  rowCount = 10,
}: ObjectListSkeletonProps) {
  return (
    <div className="h-full overflow-hidden">
      <Card className="h-full overflow-hidden shadow-none">
        <div className="h-full overflow-y-auto">
          {showNavigateUp && (
            <div
              className="grid grid-cols-[auto_1fr_120px_200px] items-center gap-4 border-b px-6"
              style={{ height: '56px' }}
            >
              <div className="flex items-center justify-center h-4 w-4">
                {/* Placeholder for checkbox alignment */}
              </div>
              <div className="flex items-center min-w-0">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="ml-3 h-4 w-16" />
              </div>
              <div></div>
              <div></div>
            </div>
          )}
          {Array.from({ length: rowCount }).map((_, index) => {
            // Deterministic width variation for visual interest
            const widthVariations = [65, 75, 70, 80, 68, 72, 78, 85, 70, 75];
            const widthPercent = widthVariations[index % widthVariations.length];

            return (
              <div
                key={index}
                className={cn(
                  'grid grid-cols-[auto_1fr_120px_200px] items-center gap-4 border-b px-6',
                  index % 2 === 0 && 'bg-muted/30'
                )}
                style={{ height: '56px' }}
              >
                {/* Checkbox column */}
                <div className="flex items-center justify-center">
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
                {/* Icon + Name column */}
                <div className="flex items-center min-w-0">
                  <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
                  <Skeleton
                    className="ml-3 h-4"
                    style={{
                      width: `${widthPercent}%`,
                      maxWidth: '300px',
                    }}
                  />
                </div>
                {/* Size column */}
                <div className="text-right flex items-center justify-end">
                  <Skeleton className="h-4 w-16" />
                </div>
                {/* Date column */}
                <div className="text-right flex items-center justify-end">
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
