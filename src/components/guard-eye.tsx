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

	return (
		<div className={cn('relative flex items-center justify-center', className)}>
			{/* Outer glow effect */}
			<div
				className={cn(
					'absolute inset-0 rounded-full blur-xl transition-all duration-500',
					isAsleep && 'bg-slate-300 opacity-30',
					isWaking && 'bg-yellow-400 opacity-50'
				)}
			/>

			{/* Eye container */}
			<div
				className={cn(
					'relative size-48 rounded-full border-8 transition-all duration-500',
					isAsleep && 'border-slate-400 bg-slate-200',
					isWaking && 'border-yellow-500 bg-yellow-100'
				)}
			>
				{/* Eyelid (covers eye when asleep) */}
				<div
					className={cn(
						'absolute inset-0 rounded-full bg-slate-300 transition-all duration-700 ease-in-out',
						isAsleep && 'translate-y-0 opacity-100',
						isWaking && 'translate-y-1/4 opacity-70'
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
						isWaking && 'scale-75 bg-yellow-600 opacity-80'
					)}
				>
					{/* Pupil */}
					<div className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 transition-all duration-300" />

					{/* Eye shine */}
					<div className="absolute top-3 right-3 size-4 rounded-full bg-white opacity-70" />
				</div>
			</div>

			{/* Status indicator text */}
			<div
				className={cn(
					'absolute -bottom-8 text-lg font-bold tracking-widest uppercase transition-all duration-300',
					isAsleep && 'text-slate-400',
					isWaking && 'text-yellow-600'
				)}
			>
				{isAsleep && 'ZZZ'}
				{isWaking && '...!'}
			</div>
		</div>
	);
};
