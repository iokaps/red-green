import { config } from '@/config';
import { type TeamState } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { useKmConfettiContext } from '@kokimoki/shared';
import { Trophy } from 'lucide-react';
import * as React from 'react';

interface PlayerVictoryViewProps {
	winningTeam: TeamState;
	isMyTeam: boolean;
}

export const PlayerVictoryView: React.FC<PlayerVictoryViewProps> = ({
	winningTeam,
	isMyTeam
}) => {
	const confetti = useKmConfettiContext();

	// Fire confetti on mount if player's team won
	React.useEffect(() => {
		if (isMyTeam) {
			confetti.triggerConfetti();
		}
	}, [isMyTeam, confetti]);

	return (
		<div className="flex w-full flex-col items-center gap-6 text-center">
			<Trophy
				className={cn(
					'size-24',
					isMyTeam ? 'text-yellow-500' : 'text-slate-400'
				)}
			/>

			<div>
				<h1
					className="text-4xl font-black"
					style={{ color: winningTeam.color }}
				>
					{winningTeam.name}
				</h1>
				<p className="mt-2 text-2xl font-bold text-slate-600">
					{config.victoryText}
				</p>
			</div>

			{isMyTeam ? (
				<p className="text-xl font-medium text-green-600">
					🎉 Congratulations! You won! 🎉
				</p>
			) : (
				<p className="text-lg text-slate-500">Better luck next time!</p>
			)}
		</div>
	);
};
