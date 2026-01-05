import { useEffect, useState } from 'react';

export interface UseTapInputResult {
	tapCount: number;
	isActive: boolean;
}

/**
 * Hook to detect rapid taps on the screen
 * Counts the number of taps detected within the component lifetime
 * @returns Object containing tap count and active state
 */
export function useTapInput(): UseTapInputResult {
	const [tapCount, setTapCount] = useState(0);
	const [isActive, setIsActive] = useState(false);

	useEffect(() => {
		let lastTapTime = 0;
		const TAP_DEBOUNCE = 100; // Minimum time between taps (ms)

		const handleTouchStart = (_e: TouchEvent) => {
			const now = Date.now();
			if (now - lastTapTime > TAP_DEBOUNCE) {
				setTapCount((prev) => prev + 1);
				lastTapTime = now;
				setIsActive(true);
				setTimeout(() => setIsActive(false), 150);
			}
		};

		const handleMouseDown = (_e: MouseEvent) => {
			const now = Date.now();
			if (now - lastTapTime > TAP_DEBOUNCE) {
				setTapCount((prev) => prev + 1);
				lastTapTime = now;
				setIsActive(true);
				setTimeout(() => setIsActive(false), 150);
			}
		};

		window.addEventListener('touchstart', handleTouchStart, { passive: true });
		window.addEventListener('mousedown', handleMouseDown);

		return () => {
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('mousedown', handleMouseDown);
		};
	}, []);

	return { tapCount, isActive };
}
