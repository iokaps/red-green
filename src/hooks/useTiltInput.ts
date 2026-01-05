import { useCallback, useEffect, useRef, useState } from 'react';

interface TiltData {
	x: number;
	y: number;
	magnitude: number;
}

interface UseTiltInputResult {
	/** Current tilt data */
	data: TiltData | null;
	/** Whether tilt exceeds threshold */
	isTilting: boolean;
	/** Request motion permission (iOS 13+) */
	requestPermission: () => Promise<boolean>;
	/** Whether motion permission has been granted */
	permissionGranted: boolean;
}

/**
 * Hook to detect device tilt using accelerometer
 */
export function useTiltInput(threshold = 8): UseTiltInputResult {
	const [data, setData] = useState<TiltData | null>(null);
	const [isTilting, setIsTilting] = useState(false);
	const [permissionGranted, setPermissionGranted] = useState(false);
	const lastUpdateRef = useRef<number>(0);

	const needsPermission = useCallback(() => {
		return (
			typeof DeviceMotionEvent !== 'undefined' &&
			typeof (DeviceMotionEvent as any).requestPermission === 'function'
		);
	}, []);

	const requestPermission = useCallback(async (): Promise<boolean> => {
		if (needsPermission()) {
			try {
				const permission = await (DeviceMotionEvent as any).requestPermission();
				const granted = permission === 'granted';
				setPermissionGranted(granted);
				return granted;
			} catch (error) {
				setPermissionGranted(false);
				return false;
			}
		}
		setPermissionGranted(true);
		return true;
	}, [needsPermission]);

	useEffect(() => {
		if (!needsPermission()) {
			setPermissionGranted(true);
		}
	}, [needsPermission]);

	useEffect(() => {
		if (!permissionGranted) {
			return;
		}

		const handleMotion = (event: DeviceMotionEvent) => {
			const now = Date.now();
			if (now - lastUpdateRef.current < 50) {
				return;
			}
			lastUpdateRef.current = now;

			const { accelerationIncludingGravity } = event;
			if (!accelerationIncludingGravity) {
				return;
			}

			const x = accelerationIncludingGravity.x ?? 0;
			const y = accelerationIncludingGravity.y ?? 0;

			const magnitude = Math.sqrt(x * x + y * y);

			setData({ x, y, magnitude });
			setIsTilting(magnitude > threshold);
		};

		window.addEventListener('devicemotion', handleMotion);
		return () => {
			window.removeEventListener('devicemotion', handleMotion);
		};
	}, [permissionGranted, threshold]);

	return {
		data,
		isTilting,
		requestPermission,
		permissionGranted
	};
}
