import { type GamePhase } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import * as React from 'react';

interface GuardEyeProps {
	phase: GamePhase;
	className?: string;
}

/**
 * Animated Guard Eye component that reacts to game phases
 * - GO: Eye is closed/asleep
 * - WARNING: Eye is opening/waking up
 * - FREEZE: Eye is fully open and scanning
 */
export const GuardEye: React.FC<GuardEyeProps> = ({ phase, className }) => {
	const isAsleep = phase === 'go' || phase === 'lobby';
	const isWaking = phase === 'warning';
	const isScanning = phase === 'freeze';

	return (
		<div className={cn('relative flex items-center justify-center', className)}>
			{/* Outer glow effect */}
			<div
				className={cn(
					'absolute inset-0 rounded-full blur-xl transition-all duration-500',
					isAsleep && 'bg-slate-300 opacity-30',
					isWaking && 'bg-yellow-400 opacity-50',
					isScanning && 'animate-pulse bg-red-500 opacity-70'
				)}
			/>

			{/* Eye container */}
			<div
				className={cn(
					'relative size-48 rounded-full border-8 transition-all duration-500',
					isAsleep && 'border-slate-400 bg-slate-200',
					isWaking && 'border-yellow-500 bg-yellow-100',
					isScanning && 'border-red-600 bg-red-100'
				)}
			>
				{/* Eyelid (covers eye when asleep) */}
				<div
					className={cn(
						'absolute inset-0 rounded-full bg-slate-300 transition-all duration-700 ease-in-out',
						isAsleep && 'translate-y-0 opacity-100',
						isWaking && 'translate-y-1/4 opacity-70',
						isScanning && 'translate-y-full opacity-0'
					)}
					style={{
						clipPath: 'ellipse(100% 50% at 50% 50%)'
					}}
				/>

				{/* Iris */}
				<div
					className={cn(
						'absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500',
						isAsleep && 'scale-50 bg-slate-500 opacity-50',
						isWaking && 'scale-75 bg-yellow-600 opacity-80',
						isScanning && 'scale-100 bg-red-600 opacity-100'
					)}
				>
					{/* Pupil */}
					<div
						className={cn(
							'absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 transition-all duration-300',
							isScanning && 'animate-scan-horizontal'
						)}
					/>

					{/* Eye shine */}
					<div className="absolute top-3 right-3 size-4 rounded-full bg-white opacity-70" />
				</div>

				{/* Scanning beam (only visible during freeze) */}
				{isScanning && (
					<div className="animate-scan-rotate absolute top-1/2 left-1/2 h-1 w-32 -translate-x-1/2 -translate-y-1/2">
						<div className="h-full w-full bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
					</div>
				)}
			</div>

			{/* Status indicator text */}
			<div
				className={cn(
					'absolute -bottom-8 text-lg font-bold tracking-widest uppercase transition-all duration-300',
					isAsleep && 'text-slate-400',
					isWaking && 'text-yellow-600',
					isScanning && 'animate-pulse text-red-600'
				)}
			>
				{isAsleep && 'ZZZ'}
				{isWaking && '...!'}
				{isScanning && 'SCANNING'}
			</div>
		</div>
	);
};
