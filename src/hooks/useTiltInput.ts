import { useEffect, useState } from 'react';

export interface UseTiltInputResult {
	tiltX: number; // X-axis tilt (-1 to 1)
	tiltY: number; // Y-axis tilt (-1 to 1)
	totalTilt: number; // Combined tilt magnitude
	isActive: boolean;
}

/**
 * Hook to detect phone tilt using accelerometer
 * Tracks X and Y axis acceleration for tilt detection
 * @returns Object containing tilt values and active state
 */
export function useTiltInput(): UseTiltInputResult {
	const [tiltX, setTiltX] = useState(0);
	const [tiltY, setTiltY] = useState(0);
	const [isActive, setIsActive] = useState(false);

	useEffect(() => {
		const updateTimeout = { id: 0 };

		const handleDeviceMotion = (event: DeviceMotionEvent) => {
			const accelX = event.accelerationIncludingGravity?.x ?? 0;
			const accelY = event.accelerationIncludingGravity?.y ?? 0;

			// Normalize to -1 to 1 range (±20 m/s² is extreme)
			const normalizedX = Math.max(-1, Math.min(1, accelX / 20));
			const normalizedY = Math.max(-1, Math.min(1, accelY / 20));

			setTiltX(normalizedX);
			setTiltY(normalizedY);

			// Check if there's significant movement
			const magnitude = Math.sqrt(
				normalizedX * normalizedX + normalizedY * normalizedY
			);
			if (magnitude > 0.3) {
				setIsActive(true);
			}

			// Clear active state after no movement
			clearTimeout(updateTimeout.id);
			updateTimeout.id = window.setTimeout(() => {
				setIsActive(false);
			}, 150);
		};

		window.addEventListener('devicemotion', handleDeviceMotion as any, {
			passive: true
		});

		return () => {
			window.removeEventListener('devicemotion', handleDeviceMotion as any);
			clearTimeout(updateTimeout.id);
		};
	}, []);

	const totalTilt = Math.sqrt(tiltX * tiltX + tiltY * tiltY);

	return { tiltX, tiltY, totalTilt, isActive };
}
