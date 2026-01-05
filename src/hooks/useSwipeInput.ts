import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSwipeInputResult {
	/** Number of swipes detected */
	swipeCount: number;
	/** Direction of last swipe ('up', 'down', 'left', 'right') */
	lastDirection: string | null;
}

/**
 * Hook to detect swipe gestures on the screen
 */
export function useSwipeInput(): UseSwipeInputResult {
	const [swipeCount, setSwipeCount] = useState(0);
	const [lastDirection, setLastDirection] = useState<string | null>(null);
	const swipeCountRef = useRef(0);
	const touchStartRef = useRef({ x: 0, y: 0 });

	const handleTouchStart = useCallback((e: TouchEvent) => {
		if (e.touches.length > 0) {
			touchStartRef.current = {
				x: e.touches[0].clientX,
				y: e.touches[0].clientY
			};
		}
	}, []);

	const handleTouchEnd = useCallback((e: TouchEvent) => {
		if (e.changedTouches.length === 0) return;

		const endX = e.changedTouches[0].clientX;
		const endY = e.changedTouches[0].clientY;
		const startX = touchStartRef.current.x;
		const startY = touchStartRef.current.y;

		const diffX = endX - startX;
		const diffY = endY - startY;
		const minSwipeDistance = 30;

		if (
			Math.abs(diffX) > minSwipeDistance ||
			Math.abs(diffY) > minSwipeDistance
		) {
			const absDiffX = Math.abs(diffX);
			const absDiffY = Math.abs(diffY);

			let direction: string;
			if (absDiffX > absDiffY) {
				direction = diffX > 0 ? 'right' : 'left';
			} else {
				direction = diffY > 0 ? 'down' : 'up';
			}

			setLastDirection(direction);
			swipeCountRef.current++;
			setSwipeCount(swipeCountRef.current);
		}
	}, []);

	useEffect(() => {
		window.addEventListener('touchstart', handleTouchStart);
		window.addEventListener('touchend', handleTouchEnd);

		return () => {
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchend', handleTouchEnd);
		};
	}, [handleTouchStart, handleTouchEnd]);

	return {
		swipeCount,
		lastDirection
	};
}
