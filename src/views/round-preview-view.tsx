import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { globalStore, type InputMode } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { useSnapshot } from '@kokimoki/app';
import { KmTimeCountdown } from '@kokimoki/shared';
import * as React from 'react';

interface RoundPreviewViewProps {
	inputMode: InputMode;
	roundNumber: number;
}

const inputModeConfig: Record<
	InputMode,
	{
		label: string;
		instructions: string;
		icon: string;
		color: string;
	}
> = {
	shake: {
		label: config.inputModeShakeLabel,
		instructions: config.inputModeShakeInstructions,
		icon: '🤲',
		color: 'from-purple-500 to-purple-600'
	},
	tap: {
		label: config.inputModeTapLabel,
		instructions: config.inputModeTapInstructions,
		icon: '👆',
		color: 'from-blue-500 to-blue-600'
	},
	tilt: {
		label: config.inputModeTiltLabel,
		instructions: config.inputModeTiltInstructions,
		icon: '⬅️➡️',
		color: 'from-green-500 to-green-600'
	},
	swipe: {
		label: config.inputModeSwipeLabel,
		instructions: config.inputModeSwipeInstructions,
		icon: '🔄',
		color: 'from-yellow-500 to-yellow-600'
	},
	sound: {
		label: config.inputModeSoundLabel,
		instructions: config.inputModeSoundInstructions,
		icon: '🔊',
		color: 'from-orange-500 to-orange-600'
	},
	target: {
		label: config.inputModeTargetLabel,
		instructions: config.inputModeTargetInstructions,
		icon: '🎯',
		color: 'from-pink-500 to-pink-600'
	},
	spinner: {
		label: config.inputModeSpinnerLabel,
		instructions: config.inputModeSpinnerInstructions,
		icon: '🎡',
		color: 'from-indigo-500 to-indigo-600'
	}
};

export const RoundPreviewView: React.FC<RoundPreviewViewProps> = ({
	inputMode,
	roundNumber
}) => {
	const { phaseStartTimestamp, currentPhaseDuration } = useSnapshot(
		globalStore.proxy
	);
	const serverTime = useServerTimer(100);

	const modeConfig = inputModeConfig[inputMode];
	const timeRemaining = Math.max(
		0,
		currentPhaseDuration - (serverTime - phaseStartTimestamp)
	);

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-8">
			{/* Round number */}
			<div className="text-6xl font-black text-slate-400">
				ROUND {roundNumber}
			</div>

			{/* Input mode icon and label */}
			<div
				className={cn(
					'flex w-full max-w-md flex-col items-center gap-6 rounded-3xl bg-gradient-to-b p-12 shadow-2xl',
					modeConfig.color
				)}
			>
				<div className="text-9xl drop-shadow-lg">{modeConfig.icon}</div>
				<div className="text-center text-4xl font-black text-white">
					{modeConfig.label}
				</div>
			</div>

			{/* Instructions */}
			<div className="w-full max-w-lg rounded-2xl bg-slate-100 p-6 text-center">
				<p className="text-lg font-semibold text-slate-700">
					{modeConfig.instructions}
				</p>
			</div>

			{/* Countdown timer */}
			<div className="flex flex-col items-center gap-3">
				<span className="text-sm font-medium text-slate-500">Starting in</span>
				<div className="rounded-2xl bg-slate-200 px-8 py-4 text-5xl font-black text-slate-700 tabular-nums">
					<KmTimeCountdown ms={timeRemaining} display="s" />
				</div>
			</div>

			{/* "Get ready" message */}
			<p className="animate-pulse text-xl font-bold text-slate-600">
				Get Ready! 🎮
			</p>
		</div>
	);
};
