import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTapInputResult {
	/** Number of taps in the current session */
	tapCount: number;
	/** Whether the user is currently touching the screen */
	isTouching: boolean;
}

/**
 * Hook to track screen taps for the TAP input mode
 */
export function useTapInput(): UseTapInputResult {
	const [tapCount, setTapCount] = useState(0);
	const [isTouching, setIsTouching] = useState(false);
	const tapCountRef = useRef(0);

	const handleTouchStart = useCallback(() => {
		setIsTouching(true);
		tapCountRef.current++;
		setTapCount(tapCountRef.current);
	}, []);

	const handleTouchEnd = useCallback(() => {
		setIsTouching(false);
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
		tapCount,
		isTouching
	};
}
