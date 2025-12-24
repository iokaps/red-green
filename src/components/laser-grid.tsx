import { cn } from '@/utils/cn';
import * as React from 'react';

interface LaserGridProps {
	active: boolean;
	className?: string;
}

/**
 * Animated laser grid overlay for FREEZE phase
 * Shows scanning laser beams that create tension during freeze
 */
export const LaserGrid: React.FC<LaserGridProps> = ({ active, className }) => {
	if (!active) {
		return null;
	}

	return (
		<div
			className={cn(
				'pointer-events-none fixed inset-0 z-40 overflow-hidden',
				className
			)}
		>
			{/* Horizontal scanning laser */}
			<div className="animate-laser-scan-v absolute left-0 h-1 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80 shadow-[0_0_20px_5px_rgba(239,68,68,0.5)]" />

			{/* Vertical scanning laser */}
			<div className="animate-laser-scan-h absolute top-0 h-full w-1 bg-gradient-to-b from-transparent via-red-500 to-transparent opacity-80 shadow-[0_0_20px_5px_rgba(239,68,68,0.5)]" />

			{/* Second horizontal laser (offset) */}
			<div
				className="animate-laser-scan-v-reverse absolute left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-60 shadow-[0_0_15px_3px_rgba(239,68,68,0.4)]"
				style={{ animationDelay: '0.5s' }}
			/>

			{/* Second vertical laser (offset) */}
			<div
				className="animate-laser-scan-h-reverse absolute top-0 h-full w-0.5 bg-gradient-to-b from-transparent via-red-400 to-transparent opacity-60 shadow-[0_0_15px_3px_rgba(239,68,68,0.4)]"
				style={{ animationDelay: '0.5s' }}
			/>

			{/* Corner glow effects */}
			<div className="bg-gradient-radial absolute top-0 left-0 size-32 from-red-500/20 to-transparent" />
			<div className="bg-gradient-radial absolute top-0 right-0 size-32 from-red-500/20 to-transparent" />
			<div className="bg-gradient-radial absolute bottom-0 left-0 size-32 from-red-500/20 to-transparent" />
			<div className="bg-gradient-radial absolute right-0 bottom-0 size-32 from-red-500/20 to-transparent" />

			{/* Scan line grid pattern overlay */}
			<div
				className="absolute inset-0 opacity-10"
				style={{
					backgroundImage: `
						linear-gradient(rgba(239, 68, 68, 0.3) 1px, transparent 1px),
						linear-gradient(90deg, rgba(239, 68, 68, 0.3) 1px, transparent 1px)
					`,
					backgroundSize: '50px 50px'
				}}
			/>
		</div>
	);
};
