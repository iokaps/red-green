import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSpinnerInputResult {
	/** Current rotation angle in degrees */
	rotation: number;
	/** Rotation velocity (degrees per second) */
	velocity: number;
	/** Total spin momentum accumulated */
	totalMomentum: number;
}

/**
 * Hook to track spinner/wheel flick input
 */
export function useSpinnerInput(): UseSpinnerInputResult {
	const [rotation, setRotation] = useState(0);
	const [velocity, setVelocity] = useState(0);
	const [totalMomentum, setTotalMomentum] = useState(0);
	const rotationRef = useRef(0);
	const velocityRef = useRef(0);
	const momentumRef = useRef(0);
	const lastTouchRef = useRef({ x: 0, y: 0, time: 0 });
	const decayIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const calculateVelocity = useCallback(
		(currentPos: { x: number; y: number }) => {
			const lastPos = lastTouchRef.current;
			const dx = currentPos.x - lastPos.x;
			const dy = currentPos.y - lastPos.y;

			const angle = Math.atan2(dy, dx) * (180 / Math.PI);
			return angle;
		},
		[]
	);

	const handleTouchStart = useCallback((e: TouchEvent) => {
		if (e.touches.length > 0) {
			lastTouchRef.current = {
				x: e.touches[0].clientX,
				y: e.touches[0].clientY,
				time: Date.now()
			};
		}
	}, []);

	const handleTouchMove = useCallback(
		(e: TouchEvent) => {
			if (e.touches.length === 0) return;

			const currentPos = {
				x: e.touches[0].clientX,
				y: e.touches[0].clientY
			};

			const deltaAngle = calculateVelocity(currentPos);
			velocityRef.current = deltaAngle;

			rotationRef.current = (rotationRef.current + deltaAngle) % 360;
			momentumRef.current += Math.abs(deltaAngle);

			setRotation(rotationRef.current);
			setVelocity(velocityRef.current);
			setTotalMomentum(momentumRef.current);

			lastTouchRef.current = {
				x: currentPos.x,
				y: currentPos.y,
				time: Date.now()
			};
		},
		[calculateVelocity]
	);

	useEffect(() => {
		// Apply velocity decay
		decayIntervalRef.current = setInterval(() => {
			velocityRef.current *= 0.95;
			if (Math.abs(velocityRef.current) < 0.1) {
				velocityRef.current = 0;
			}
			setVelocity(velocityRef.current);
		}, 16);

		window.addEventListener('touchstart', handleTouchStart);
		window.addEventListener('touchmove', handleTouchMove);

		return () => {
			if (decayIntervalRef.current) {
				clearInterval(decayIntervalRef.current);
			}
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchmove', handleTouchMove);
		};
	}, [handleTouchStart, handleTouchMove]);

	return {
		rotation,
		velocity,
		totalMomentum
	};
}
