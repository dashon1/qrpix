import React, { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e) => {
    const scrollTop = containerRef.current?.scrollTop || window.scrollY;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      // Dampen the pull distance
      setPullDistance(Math.min(diff * 0.4, 120));
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.5);
      try {
        await onRefresh();
      } catch (e) {
        console.error("Refresh error:", e);
      }
      setRefreshing(false);
    }
    setPullDistance(0);
    setPulling(false);
  }, [pulling, pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        className="pull-refresh-indicator flex items-center justify-center overflow-hidden"
        style={{
          height: pullDistance > 0 || refreshing ? Math.max(pullDistance, refreshing ? 40 : 0) : 0,
          opacity: pullDistance > 10 || refreshing ? 1 : 0,
        }}
      >
        <RefreshCw
          className={`w-5 h-5 text-purple-600 ${refreshing ? "animate-spin" : ""}`}
          style={{
            transform: refreshing ? "none" : `rotate(${pullDistance * 3}deg)`,
          }}
        />
        {pullDistance >= THRESHOLD && !refreshing && (
          <span className="ml-2 text-xs text-purple-600 font-medium">Release to refresh</span>
        )}
        {refreshing && (
          <span className="ml-2 text-xs text-purple-600 font-medium">Refreshing...</span>
        )}
      </div>
      {children}
    </div>
  );
}