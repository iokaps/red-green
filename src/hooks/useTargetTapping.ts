import { useEffect, useState } from 'react';

export interface Target {
	id: string;
	x: number;
	y: number;
	size: number;
	createdAt: number;
	hit: boolean;
}

export interface UseTargetTappingResult {
	targets: Target[];
	hitCount: number;
	isActive: boolean;
}

/**
 * Hook to manage target tapping gameplay
 * Generates random targets on screen that players tap to score
 * @param isActive Whether to generate new targets
 * @returns Object containing targets, hit count, and active state
 */
export function useTargetTapping(isActive: boolean): UseTargetTappingResult {
	const [targets, setTargets] = useState<Target[]>([]);
	const [hitCount, setHitCount] = useState(0);
	const TARGET_LIFETIME = 800; // How long each target shows
	const SPAWN_INTERVAL = 400; // How often to spawn new targets
	const TARGET_SIZE = 50; // Size in pixels

	// Spawn new targets
	useEffect(() => {
		if (!isActive) return;

		const spawnInterval = setInterval(() => {
			const newTarget: Target = {
				id: `${Date.now()}-${Math.random()}`,
				x:
					Math.random() *
					(typeof window !== 'undefined'
						? window.innerWidth - TARGET_SIZE
						: 300),
				y:
					Math.random() *
					(typeof window !== 'undefined'
						? window.innerHeight - TARGET_SIZE
						: 400),
				size: TARGET_SIZE,
				createdAt: Date.now(),
				hit: false
			};

			setTargets((prev) => [...prev, newTarget]);
		}, SPAWN_INTERVAL);

		return () => clearInterval(spawnInterval);
	}, [isActive]);

	// Remove expired targets
	useEffect(() => {
		const cleanupInterval = setInterval(() => {
			setTargets((prev) =>
				prev.filter((target) => Date.now() - target.createdAt < TARGET_LIFETIME)
			);
		}, 100);

		return () => clearInterval(cleanupInterval);
	}, []);

	// Handle target taps
	useEffect(() => {
		const handleTap = (e: TouchEvent | MouseEvent) => {
			const rect = (e.target as HTMLElement)?.getBoundingClientRect?.();
			if (!rect) return;

			const clientX =
				e instanceof TouchEvent
					? e.touches[0]?.clientX
					: (e as MouseEvent).clientX;
			const clientY =
				e instanceof TouchEvent
					? e.touches[0]?.clientY
					: (e as MouseEvent).clientY;

			if (!clientX || !clientY) return;

			const tapX = clientX - rect.left;
			const tapY = clientY - rect.top;

			setTargets((prev) =>
				prev.map((target) => {
					if (target.hit) return target;

					const distance = Math.sqrt(
						Math.pow(tapX - (target.x + target.size / 2), 2) +
							Math.pow(tapY - (target.y + target.size / 2), 2)
					);

					if (distance < target.size) {
						setHitCount((prevCount) => prevCount + 1);
						return { ...target, hit: true };
					}

					return target;
				})
			);
		};

		const gameArea = document.getElementById('target-game-area');
		if (gameArea) {
			gameArea.addEventListener('touchstart', handleTap as any, {
				passive: true
			});
			gameArea.addEventListener('click', handleTap as any);
		}

		return () => {
			if (gameArea) {
				gameArea.removeEventListener('touchstart', handleTap as any);
				gameArea.removeEventListener('click', handleTap as any);
			}
		};
	}, []);

	return { targets, hitCount, isActive };
}
