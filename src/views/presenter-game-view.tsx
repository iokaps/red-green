import { GuardEye } from '@/components/guard-eye';
import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { globalStore, type GamePhase } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { useSnapshot } from '@kokimoki/app';
import { KmTimeCountdown, useKmConfettiContext } from '@kokimoki/shared';
import { Trophy } from 'lucide-react';
import * as React from 'react';

/**
 * Get phase duration - now uses currentPhaseDuration from state
 */
function getPhaseDuration(
	phase: GamePhase,
	currentPhaseDuration: number
): number {
	// Use variable duration from state if available
	if (currentPhaseDuration > 0) {
		return currentPhaseDuration;
	}
	// Fallback to config defaults
	switch (phase) {
		case 'go':
			return config.goPhaseDurationMs;
		case 'warning':
			return config.warningPhaseDurationMs;
		default:
			return 0;
	}
}

export const PresenterGameView: React.FC = () => {
	const {
		gamePhase,
		phaseStartTimestamp,
		currentPhaseDuration,
		currentRound,
		currentInputMode,
		teams,
		winningTeam,
		playerTeams,
		mvpPlayers,
		traitorId,
		traitorRevealed,
		players
	} = useSnapshot(globalStore.proxy);
	const { clientIds: onlinePlayerIds } = useSnapshot(globalStore.connections);
	const serverTime = useServerTimer(100);
	const confetti = useKmConfettiContext();

	// Fire confetti on victory
	const hasFiredConfetti = React.useRef(false);
	React.useEffect(() => {
		if (gamePhase === 'victory' && winningTeam && !hasFiredConfetti.current) {
			hasFiredConfetti.current = true;
			confetti.triggerConfetti({ preset: 'massive' });
		} else if (gamePhase !== 'victory') {
			hasFiredConfetti.current = false;
		}
	}, [gamePhase, winningTeam, confetti]);

	// Count online players per team
	const teamCounts = React.useMemo(() => {
		const counts = { red: 0, blue: 0 };
		for (const [clientId, teamId] of Object.entries(playerTeams)) {
			if (onlinePlayerIds.has(clientId)) {
				counts[teamId]++;
			}
		}
		return counts;
	}, [playerTeams, onlinePlayerIds]);

	// Calculate time remaining
	const phaseDuration = getPhaseDuration(gamePhase, currentPhaseDuration);
	const timeRemaining = Math.max(
		0,
		phaseDuration - (serverTime - phaseStartTimestamp)
	);

	// Track penalty flash
	const [penaltyFlash, setPenaltyFlash] = React.useState<'red' | 'blue' | null>(
		null
	);
	const lastPenaltyTimestamps = React.useRef({ red: 0, blue: 0 });

	React.useEffect(() => {
		// Check for new penalties
		if (teams.red.lastPenaltyTimestamp > lastPenaltyTimestamps.current.red) {
			lastPenaltyTimestamps.current.red = teams.red.lastPenaltyTimestamp;
			setPenaltyFlash('red');
			setTimeout(() => setPenaltyFlash(null), 1000);
		}
		if (teams.blue.lastPenaltyTimestamp > lastPenaltyTimestamps.current.blue) {
			lastPenaltyTimestamps.current.blue = teams.blue.lastPenaltyTimestamp;
			setPenaltyFlash('blue');
			setTimeout(() => setPenaltyFlash(null), 1000);
		}
	}, [teams.red.lastPenaltyTimestamp, teams.blue.lastPenaltyTimestamp]);

	// Victory screen
	if (gamePhase === 'victory' && winningTeam) {
		const winner = teams[winningTeam];
		const traitorName =
			traitorRevealed && traitorId && players[traitorId]
				? players[traitorId].name
				: null;

		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-8">
				<Trophy className="size-32 text-yellow-500" />
				<h1 className="text-6xl font-black" style={{ color: winner.color }}>
					{winner.name}
				</h1>
				<p className="text-3xl font-bold text-slate-600">
					{config.victoryText}
				</p>
				{traitorName && (
					<p className="mt-4 text-xl text-amber-600">
						Traitor revealed: <strong>{traitorName}</strong>
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-between gap-6 bg-gradient-to-b from-slate-900 to-slate-800 p-6">
			{/* Top Section: Round Info */}
			{gamePhase !== 'lobby' && (
				<div className="flex w-full flex-col items-center gap-4">
					<div className="text-3xl font-bold text-slate-300">
						ROUND {currentRound}
					</div>
					<div className="flex items-center gap-8">
						<div
							className={cn(
								'rounded-2xl px-12 py-6 text-7xl font-black tabular-nums transition-all',
								gamePhase === 'go' &&
									'bg-green-500 text-white shadow-lg shadow-green-500/50',
								gamePhase === 'warning' &&
									'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-400/50',

								gamePhase === 'preview' && 'bg-slate-600 text-white shadow-lg'
							)}
						>
							<KmTimeCountdown ms={timeRemaining} display="s" />
						</div>
						<div className="text-4xl font-bold text-white">
							{currentInputMode.toUpperCase()}
						</div>
					</div>
				</div>
			)}

			{/* Middle Section: Guard Eye */}
			<div className="flex flex-1 items-center justify-center">
				<GuardEye phase={gamePhase} className="scale-200" />
			</div>

			{/* MVP Spotlight - Enhanced */}
			{gamePhase === 'go' && config.mvpSpotlightEnabled && (
				<div className="flex w-full max-w-5xl justify-between gap-6">
					{/* Red team MVP */}
					<div
						className="flex flex-1 flex-col items-center rounded-2xl p-6 shadow-xl transition-transform hover:scale-105"
						style={{
							backgroundColor: `${teams.red.color}30`,
							border: `3px solid ${teams.red.color}`
						}}
					>
						<span className="mb-3 text-3xl">{config.mvpLabel}</span>
						{mvpPlayers.red ? (
							<span
								className="text-2xl font-black"
								style={{ color: teams.red.color }}
							>
								{mvpPlayers.red.name}
							</span>
						) : (
							<span className="text-2xl text-slate-400">—</span>
						)}
					</div>
					{/* Blue team MVP */}
					<div
						className="flex flex-1 flex-col items-center rounded-2xl p-6 shadow-xl transition-transform hover:scale-105"
						style={{
							backgroundColor: `${teams.blue.color}30`,
							border: `3px solid ${teams.blue.color}`
						}}
					>
						<span className="mb-3 text-3xl">{config.mvpLabel}</span>
						{mvpPlayers.blue ? (
							<span
								className="text-2xl font-black"
								style={{ color: teams.blue.color }}
							>
								{mvpPlayers.blue.name}
							</span>
						) : (
							<span className="text-2xl text-slate-400">—</span>
						)}
					</div>
				</div>
			)}

			{/* Bottom Section: Race Track - Much Larger */}
			<div className="w-full max-w-6xl space-y-6">
				{/* Track container - Enlarged */}
				<div className="relative h-48 rounded-3xl border-6 border-slate-400 bg-gradient-to-r from-slate-700 to-slate-600 shadow-2xl">
					{/* Finish line */}
					<div className="absolute top-0 right-0 flex h-full w-24 items-center justify-center border-l-8 border-dashed border-slate-300 bg-slate-500/30">
						<Trophy className="size-16 text-yellow-400" />
					</div>

					{/* Red team avatar - Larger */}
					<div
						className={cn(
							'absolute top-3 flex h-32 w-32 items-center justify-center rounded-2xl font-black text-white shadow-xl transition-all duration-500',
							penaltyFlash === 'red' &&
								'animate-shake scale-110 ring-4 ring-red-300'
						)}
						style={{
							left: `calc(${(teams.red.position / config.totalDistance) * 85}% )`,
							backgroundColor: teams.red.color
						}}
					>
						<div className="flex flex-col items-center">
							<span className="text-5xl">{teamCounts.red}</span>
							<span className="text-xl">Players</span>
						</div>
					</div>

					{/* Blue team avatar - Larger */}
					<div
						className={cn(
							'absolute bottom-3 flex h-32 w-32 items-center justify-center rounded-2xl font-black text-white shadow-xl transition-all duration-500',
							penaltyFlash === 'blue' &&
								'animate-shake scale-110 ring-4 ring-blue-300'
						)}
						style={{
							left: `calc(${(teams.blue.position / config.totalDistance) * 85}%)`,
							backgroundColor: teams.blue.color
						}}
					>
						<div className="flex flex-col items-center">
							<span className="text-5xl">{teamCounts.blue}</span>
							<span className="text-xl">Players</span>
						</div>
					</div>
				</div>

				{/* Team labels with positions and progress bar - Enhanced */}
				<div className="space-y-4">
					{/* Red team */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div
									className="size-6 rounded-full shadow-lg"
									style={{ backgroundColor: teams.red.color }}
								/>
								<span
									className="text-3xl font-black"
									style={{ color: teams.red.color }}
								>
									{teams.red.name}
								</span>
							</div>
							<div className="flex items-baseline gap-3">
								<span className="text-3xl font-bold text-white">
									{Math.round(teams.red.position)}m
								</span>
								<span className="text-2xl text-slate-400">
									/ {config.totalDistance}m (
									{Math.round(
										(teams.red.position / config.totalDistance) * 100
									)}
									%)
								</span>
							</div>
						</div>
						<div className="h-3 overflow-hidden rounded-full bg-slate-700">
							<div
								className="h-full transition-all duration-500"
								style={{
									width: `${(teams.red.position / config.totalDistance) * 100}%`,
									backgroundColor: teams.red.color
								}}
							/>
						</div>
					</div>

					{/* Blue team */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div
									className="size-6 rounded-full shadow-lg"
									style={{ backgroundColor: teams.blue.color }}
								/>
								<span
									className="text-3xl font-black"
									style={{ color: teams.blue.color }}
								>
									{teams.blue.name}
								</span>
							</div>
							<div className="flex items-baseline gap-3">
								<span className="text-3xl font-bold text-white">
									{Math.round(teams.blue.position)}m
								</span>
								<span className="text-2xl text-slate-400">
									/ {config.totalDistance}m (
									{Math.round(
										(teams.blue.position / config.totalDistance) * 100
									)}
									%)
								</span>
							</div>
						</div>
						<div className="h-3 overflow-hidden rounded-full bg-slate-700">
							<div
								className="h-full transition-all duration-500"
								style={{
									width: `${(teams.blue.position / config.totalDistance) * 100}%`,
									backgroundColor: teams.blue.color
								}}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Penalty Flash Overlay - More dramatic */}
			{penaltyFlash && (
				<div
					className={cn(
						'animate-flash pointer-events-none fixed inset-0 z-50',
						penaltyFlash === 'red' ? 'bg-red-500/40' : 'bg-blue-500/40'
					)}
				/>
			)}
		</div>
	);
};
