import { useCallback, useEffect, useRef, useState } from 'react';

interface AccelerometerData {
	x: number;
	y: number;
	z: number;
	magnitude: number;
}

interface UseAccelerometerOptions {
	/** Threshold for shake detection in m/s² (default: 12) */
	threshold?: number;
	/** Update interval in ms (default: 50) */
	interval?: number;
}

interface UseAccelerometerResult {
	/** Current accelerometer data */
	data: AccelerometerData | null;
	/** Whether current magnitude exceeds threshold */
	isShaking: boolean;
	/** Whether motion permission has been granted */
	permissionGranted: boolean;
	/** Whether permission is still being determined */
	permissionPending: boolean;
	/** Request motion permission (required on iOS 13+) */
	requestPermission: () => Promise<boolean>;
}

// Gravity constant to subtract from magnitude
const GRAVITY = 9.8;

/**
 * Hook to access device accelerometer data with shake detection
 */
export function useAccelerometer(
	options: UseAccelerometerOptions = {}
): UseAccelerometerResult {
	const { threshold = 12, interval = 50 } = options;

	const [data, setData] = useState<AccelerometerData | null>(null);
	const [isShaking, setIsShaking] = useState(false);
	const [permissionGranted, setPermissionGranted] = useState(false);
	const [permissionPending, setPermissionPending] = useState(true);

	const lastUpdateRef = useRef<number>(0);

	// Check if DeviceMotionEvent requires permission (iOS 13+)
	const needsPermission = useCallback(() => {
		return (
			typeof DeviceMotionEvent !== 'undefined' &&
			typeof (
				DeviceMotionEvent as unknown as {
					requestPermission?: () => Promise<string>;
				}
			).requestPermission === 'function'
		);
	}, []);

	// Request permission for motion sensors
	const requestPermission = useCallback(async (): Promise<boolean> => {
		if (needsPermission()) {
			try {
				const permission = await (
					DeviceMotionEvent as unknown as {
						requestPermission: () => Promise<string>;
					}
				).requestPermission();
				const granted = permission === 'granted';
				setPermissionGranted(granted);
				setPermissionPending(false);
				return granted;
			} catch (error) {
				console.error('Failed to request motion permission:', error);
				setPermissionGranted(false);
				setPermissionPending(false);
				return false;
			}
		}

		// Permission not required (Android, desktop, older iOS)
		setPermissionGranted(true);
		setPermissionPending(false);
		return true;
	}, [needsPermission]);

	// Check initial permission state
	useEffect(() => {
		if (!needsPermission()) {
			// No permission needed, auto-grant
			setPermissionGranted(true);
			setPermissionPending(false);
		} else {
			// iOS - permission needed but we can't check state without user gesture
			setPermissionPending(false);
		}
	}, [needsPermission]);

	// Handle device motion events
	useEffect(() => {
		if (!permissionGranted) {
			return;
		}

		const handleMotion = (event: DeviceMotionEvent) => {
			const now = Date.now();

			// Throttle updates based on interval
			if (now - lastUpdateRef.current < interval) {
				return;
			}
			lastUpdateRef.current = now;

			const { accelerationIncludingGravity } = event;
			if (!accelerationIncludingGravity) {
				return;
			}

			const x = accelerationIncludingGravity.x ?? 0;
			const y = accelerationIncludingGravity.y ?? 0;
			const z = accelerationIncludingGravity.z ?? 0;

			// Calculate magnitude and subtract gravity baseline
			const rawMagnitude = Math.sqrt(x * x + y * y + z * z);
			const magnitude = Math.abs(rawMagnitude - GRAVITY);

			setData({ x, y, z, magnitude });
			setIsShaking(magnitude > threshold);
		};

		window.addEventListener('devicemotion', handleMotion);

		return () => {
			window.removeEventListener('devicemotion', handleMotion);
		};
	}, [permissionGranted, threshold, interval]);

	return {
		data,
		isShaking,
		permissionGranted,
		permissionPending,
		requestPermission
	};
}
