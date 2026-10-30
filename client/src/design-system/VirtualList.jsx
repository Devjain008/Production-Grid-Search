import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Lightweight, 60 FPS Windowed Virtual List
 * Virtualizes long lists (defect cards, memory experiments, reports) with zero bundle overhead.
 */
export function VirtualList({
  items = [],
  itemHeight = 80,
  maxHeight = 520,
  renderItem,
  className = '',
  overscan = 3,
  emptyMessage = 'No items found.'
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(typeof maxHeight === 'number' ? maxHeight : 500);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight || 500);
    }
  }, []);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalCount = items.length;
  const totalHeight = totalCount * itemHeight;

  if (totalCount === 0) {
    return (
      <div className="py-12 text-center text-slate-500 text-xs">
        {emptyMessage}
      </div>
    );
  }

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(totalCount - 1, Math.floor((scrollTop + containerHeight) / itemHeight) + overscan);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({
      item: items[i],
      index: i,
      offsetTop: i * itemHeight
    });
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ maxHeight }}
      className={`overflow-y-auto relative w-full ${className}`}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        {visibleItems.map(({ item, index, offsetTop }) => (
          <div
            key={item?._id || item?.id || index}
            style={{
              position: 'absolute',
              top: offsetTop,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualList;
