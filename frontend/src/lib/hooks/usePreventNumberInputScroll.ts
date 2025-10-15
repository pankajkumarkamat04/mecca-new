import { useCallback } from 'react';

/**
 * Custom hook to prevent number input scroll behavior
 * This hook provides event handlers to prevent the default scroll behavior
 * when users scroll over number inputs
 */
export const usePreventNumberInputScroll = () => {
  const handleWheel = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    if (e.currentTarget.type === 'number') {
      e.currentTarget.blur();
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.currentTarget.type === 'number') {
      // Prevent arrow keys from changing values when not focused
      if (!e.currentTarget.matches(':focus')) {
        if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
        }
      }
    }
  }, []);

  return {
    onWheel: handleWheel,
    onKeyDown: handleKeyDown,
  };
};

export default usePreventNumberInputScroll;
