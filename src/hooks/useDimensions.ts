import { useState, useEffect, useRef, useCallback } from 'react';

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Track the dimensions of a container element via ResizeObserver.
 * Returns [ref, dimensions] — attach the ref to the container div.
 */
export function useDimensions(): [
  React.RefCallback<HTMLDivElement>,
  Dimensions,
] {
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          setDimensions({ width, height });
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return [ref, dimensions];
}
