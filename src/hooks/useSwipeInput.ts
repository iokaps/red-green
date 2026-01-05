import { useEffect, useRef, useState } from 'react';

interface UseSwipeInputResult {
	swipeCount: number;
	totalDistance: number;
	isActive: boolean;
}

/**
 * Hook to detect swipe gestures on the screen
 * Tracks swipe count and total distance traveled
 */
export function useSwipeInput(): UseSwipeInputResult {
	const [swipeCount, setSwipeCount] = useState(0);
	const [totalDistance, setTotalDistance] = useState(0);
	const [isActive, setIsActive] = useState(false);

	const startXRef = useRef(0);
	const startYRef = useRef(0);
	const minSwipeDistance = 30; // Minimum distance to count as a swipe (pixels)

	useEffect(() => {
		const handleTouchStart = (event: TouchEvent) => {
			if (event.touches.length > 0) {
				startXRef.current = event.touches[0].clientX;
				startYRef.current = event.touches[0].clientY;
			}
		};

		const handleTouchEnd = (event: TouchEvent) => {
			if (event.changedTouches.length > 0) {
				const endX = event.changedTouches[0].clientX;
				const endY = event.changedTouches[0].clientY;

				const diffX = Math.abs(endX - startXRef.current);
				const diffY = Math.abs(endY - startYRef.current);
				const distance = Math.sqrt(diffX * diffX + diffY * diffY);

				// Only count swipes that meet minimum distance
				if (distance >= minSwipeDistance) {
					setSwipeCount((prev) => prev + 1);
					setTotalDistance((prev) => prev + distance);
					setIsActive(true);

					// Reset active state after a short delay
					setTimeout(() => {
						setIsActive(false);
					}, 100);
				}
			}
		};

		window.addEventListener('touchstart', handleTouchStart);
		window.addEventListener('touchend', handleTouchEnd);

		return () => {
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchend', handleTouchEnd);
		};
	}, []);

	return {
		swipeCount,
		totalDistance,
		isActive
	};
}
