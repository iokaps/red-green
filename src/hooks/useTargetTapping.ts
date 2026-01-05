import { useCallback, useEffect, useRef, useState } from 'react';

export interface Target {
	id: string;
	x: number; // 0-100 (percent)
	y: number; // 0-100 (percent)
	createdAt: number;
	size: number; // in pixels
}

interface UseTargetTappingResult {
	/** Current active targets */
	targets: Target[];
	/** Number of taps on targets */
	hitCount: number;
	/** Start spawning targets */
	startTargets: () => void;
	/** Stop spawning targets */
	stopTargets: () => void;
}

/**
 * Hook to manage target tapping gameplay
 */
export function useTargetTapping(
	spawnInterval = 800,
	targetLifetime = 800
): UseTargetTappingResult {
	const [targets, setTargets] = useState<Target[]>([]);
	const [hitCount, setHitCount] = useState(0);
	const isActiveRef = useRef(false);
	const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const targetLifetimeRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

	const spawnTarget = useCallback(() => {
		const id = Math.random().toString(36).substr(2, 9);
		const newTarget: Target = {
			id,
			x: Math.random() * 80 + 10, // 10-90%
			y: Math.random() * 60 + 20, // 20-80%
			createdAt: Date.now(),
			size: 60
		};

		setTargets((prev) => [...prev, newTarget]);

		// Remove target after lifetime
		const timeout = setTimeout(() => {
			setTargets((prev) => prev.filter((t) => t.id !== id));
			targetLifetimeRef.current.delete(id);
		}, targetLifetime);

		targetLifetimeRef.current.set(id, timeout);
	}, [targetLifetime]);

	const handleTap = useCallback((e: TouchEvent) => {
		if (e.touches.length === 0) return;

		const touch = e.touches[0];
		const rect = (e.target as HTMLElement).getBoundingClientRect?.();

		if (!rect) return;

		const tapX = ((touch.clientX - rect.left) / rect.width) * 100;
		const tapY = ((touch.clientY - rect.top) / rect.height) * 100;

		setTargets((prev) => {
			const remaining = prev.filter((target) => {
				const dx = target.x - tapX;
				const dy = target.y - tapY;
				const distance = Math.sqrt(dx * dx + dy * dy);
				const hitRadius =
					(target.size / 2 / Math.min(rect.width, rect.height)) * 100;

				if (distance < hitRadius) {
					setHitCount((c) => c + 1);
					return false;
				}
				return true;
			});

			return remaining;
		});
	}, []);

	const startTargets = useCallback(() => {
		isActiveRef.current = true;
		spawnIntervalRef.current = setInterval(spawnTarget, spawnInterval);
	}, [spawnTarget, spawnInterval]);

	const stopTargets = useCallback(() => {
		isActiveRef.current = false;
		if (spawnIntervalRef.current) {
			clearInterval(spawnIntervalRef.current);
		}
		// Clear all timeouts
		targetLifetimeRef.current.forEach((timeout) => clearTimeout(timeout));
		targetLifetimeRef.current.clear();
		setTargets([]);
	}, []);

	useEffect(() => {
		if (isActiveRef.current) {
			window.addEventListener('touchstart', handleTap);
			return () => {
				window.removeEventListener('touchstart', handleTap);
			};
		}
	}, [handleTap]);

	return {
		targets,
		hitCount,
		startTargets,
		stopTargets
	};
}
