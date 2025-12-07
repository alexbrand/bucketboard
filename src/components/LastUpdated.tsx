'use client';

import { useState, useEffect, useMemo } from 'react';

interface LastUpdatedProps {
  timestamp: number | null;
  className?: string;
}

function computeTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000); // Difference in seconds

  if (diff < 5) {
    return 'just now';
  } else if (diff < 60) {
    return `${diff} second${diff !== 1 ? 's' : ''} ago`;
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diff / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

export function LastUpdated({ timestamp, className = '' }: LastUpdatedProps) {
  // Track a counter that increments on each interval tick to force re-render
  const [tick, setTick] = useState(0);

  // Compute timeAgo from timestamp - recalculates when timestamp or tick changes
  const timeAgo = useMemo(() => {
    // tick is used to trigger recalculation but not directly used in computation
    void tick;
    return timestamp ? computeTimeAgo(timestamp) : '';
  }, [timestamp, tick]);

  useEffect(() => {
    if (!timestamp) {
      return;
    }

    // Set up interval that adjusts based on age
    let timer: NodeJS.Timeout | undefined;

    const scheduleUpdate = () => {
      const now = Date.now();
      const age = now - timestamp;

      // Clear existing timer
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }

      // Update every second if less than a minute old, otherwise every minute
      const interval = age < 60000 ? 1000 : 60000;
      timer = setInterval(() => {
        setTick((t) => t + 1);
        // Re-schedule if we've crossed the 1-minute threshold
        const currentAge = Date.now() - timestamp;
        if (currentAge >= 60000 && interval === 1000) {
          scheduleUpdate();
        }
      }, interval);
    };

    scheduleUpdate();

    return () => {
      if (timer !== undefined) {
        clearInterval(timer);
      }
    };
  }, [timestamp]);

  if (!timestamp || !timeAgo) {
    return null;
  }

  return (
    <span className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      Last updated: {timeAgo}
    </span>
  );
}
