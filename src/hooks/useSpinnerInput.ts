import { useEffect, useRef, useState } from 'react';

export interface UseSpinnerInputResult {
	rotation: number;
	spinCount: number;
	isActive: boolean;
}

/**
 * Hook to detect spinner/wheel flick input
 * Tracks touch swipes for spinning momentum
 * @returns Object containing rotation, spin count, and active state
 */
export function useSpinnerInput(): UseSpinnerInputResult {
	const [rotation, setRotation] = useState(0);
	const [spinCount, setSpinCount] = useState(0);
	const [isActive, setIsActive] = useState(false);
	const lastYRef = useRef<number | null>(null);
	const velocityRef = useRef(0);
	const lastTimeRef = useRef(Date.now());

	useEffect(() => {
		const handleTouchStart = (e: TouchEvent) => {
			lastYRef.current = e.touches[0]?.clientY ?? null;
			lastTimeRef.current = Date.now();
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (lastYRef.current === null) return;

			const currentY = e.touches[0]?.clientY ?? 0;
			const deltaY = currentY - lastYRef.current;
			const deltaTime = Date.now() - lastTimeRef.current;

			if (deltaTime > 0) {
				velocityRef.current = deltaY / deltaTime;

				// Convert to rotation (1px = 2 degrees)
				const deltaRotation = deltaY * 2;
				setRotation((prev) => prev + deltaRotation);
				setIsActive(true);
			}

			lastYRef.current = currentY;
			lastTimeRef.current = Date.now();
		};

		const handleTouchEnd = () => {
			if (Math.abs(velocityRef.current) > 1) {
				// Significant flick detected
				setSpinCount((prev) => prev + 1);

				// Apply momentum
				let momentum = velocityRef.current * 100;
				const applyMomentum = () => {
					if (Math.abs(momentum) > 0.5) {
						setRotation((prev) => prev + momentum);
						momentum *= 0.95; // Friction
						requestAnimationFrame(applyMomentum);
					} else {
						setIsActive(false);
					}
				};
				applyMomentum();
			} else {
				setIsActive(false);
			}

			lastYRef.current = null;
			velocityRef.current = 0;
		};

		window.addEventListener('touchstart', handleTouchStart, { passive: true });
		window.addEventListener('touchmove', handleTouchMove, { passive: true });
		window.addEventListener('touchend', handleTouchEnd);

		return () => {
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchmove', handleTouchMove);
			window.removeEventListener('touchend', handleTouchEnd);
		};
	}, []);

	return { rotation, spinCount, isActive };
}
