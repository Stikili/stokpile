import { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface PullToRefreshProps {
  children: React.ReactNode;
}

const THRESHOLD = 80; // pixels to pull before triggering

export function PullToRefresh({ children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const qc = useQueryClient();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && diff < 150) {
      setPullDistance(diff);
    }
  }, [pulling]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      await qc.invalidateQueries();
      // Small delay so spinner is visible
      await new Promise(r => setTimeout(r, 500));
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, refreshing, qc]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: refreshing ? 40 : pullDistance > 10 ? Math.min(pullDistance * 0.5, 40) : 0 }}
      >
        <RefreshCw
          className={`h-5 w-5 text-primary transition-transform ${refreshing ? 'animate-spin' : ''}`}
          style={{ opacity: progress, transform: `rotate(${progress * 360}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}
